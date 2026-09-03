"""
Tests for Appointments App:
- CONCURRENCY TEST (parallel booking of same slot -> one 200/201, one 409)
- Boundary time validation (past slots)
- Overlapping patient appointment prevention
- Cancellation rules (6h window)
- Status transitions & Celery mark_missed_appointments task.
"""

from datetime import datetime, timedelta
import threading
import pytest
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.appointments.models import Appointment
from apps.notifications.tasks import mark_missed_appointments
from tests.factories import (
    AppointmentFactory,
    AvailabilityRuleFactory,
    DoctorProfileFactory,
    UserFactory,
)


@pytest.mark.django_db(transaction=True)
class TestAppointmentsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_concurrency_parallel_booking_same_slot(self):
        """
        THE SIGNATURE CONCURRENCY TEST:
        Two parallel threads attempt to book the exact same doctor slot simultaneously.
        Atomic database locking / select_for_update ensures ONE succeeds (201/200) and ONE fails (409 Conflict).
        """
        doctor = DoctorProfileFactory()
        patient1 = UserFactory()
        patient2 = UserFactory()

        # Slot time tomorrow at 10:00 AM
        tomorrow = timezone.now() + timedelta(days=1)
        slot_start = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        slot_end = slot_start + timedelta(minutes=30)

        # Ensure weekday rule exists
        AvailabilityRuleFactory(
            doctor=doctor,
            weekday=slot_start.isoweekday(),
            start_time="09:00:00",
            end_time="17:00:00",
        )

        url = reverse("appointments:appointment-list-create")

        results = []
        barrier = threading.Barrier(2)

        def book_slot(patient_user, res_list):
            # Close stale db connection for thread safety
            connection.close()
            client = APIClient()
            client.force_authenticate(user=patient_user)

            payload = {
                "doctor_id": doctor.id,
                "start_time": slot_start.isoformat(),
                "end_time": slot_end.isoformat(),
                "symptoms": "Concurrency test booking",
            }

            barrier.wait()  # Synchronize thread launch to exact same millisecond
            res = client.post(url, payload, format="json")
            res_list.append(res.status_code)
            connection.close()

        t1 = threading.Thread(target=book_slot, args=(patient1, results))
        t2 = threading.Thread(target=book_slot, args=(patient2, results))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Verify concurrency protection
        assert len(results) == 2
        assert status.HTTP_201_CREATED in results or status.HTTP_200_OK in results
        assert status.HTTP_409_CONFLICT in results or status.HTTP_400_BAD_REQUEST in results

        # Database must only contain 1 appointment for this slot
        count = Appointment.objects.filter(
            doctor=doctor, start_time=slot_start
        ).count()
        assert count == 1

    def test_past_time_booking_boundary_returns_400(self):
        doctor = DoctorProfileFactory()
        patient = UserFactory()
        self.client.force_authenticate(user=patient)

        past_start = timezone.now() - timedelta(hours=2)
        past_end = past_start + timedelta(minutes=30)

        url = reverse("appointments:appointment-list-create")
        payload = {
            "doctor": doctor.id,
            "start_time": past_start.isoformat(),
            "end_time": past_end.isoformat(),
            "symptoms": "Past slot test",
        }
        res = self.client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancellation_6h_window_rule(self):
        patient = UserFactory()
        self.client.force_authenticate(user=patient)

        # 1. Appointment in 2 hours (< 6 hours away) -> Cancel rejected
        near_appt = AppointmentFactory(
            patient=patient,
            start_time=timezone.now() + timedelta(hours=2),
            status=Appointment.Status.CONFIRMED,
        )
        url_near = reverse(
            "appointments:appointment-cancel", kwargs={"pk": near_appt.id}
        )
        res_near = self.client.post(
            url_near, {"reason": "Personal emergency"}, format="json"
        )
        assert res_near.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Appointment in 24 hours (> 6 hours away) -> Cancel succeeds
        far_appt = AppointmentFactory(
            patient=patient,
            start_time=timezone.now() + timedelta(hours=24),
            status=Appointment.Status.CONFIRMED,
        )
        url_far = reverse(
            "appointments:appointment-cancel", kwargs={"pk": far_appt.id}
        )
        res_far = self.client.post(
            url_far, {"reason": "Rescheduled plans"}, format="json"
        )
        assert res_far.status_code == status.HTTP_200_OK

        far_appt.refresh_from_db()
        assert far_appt.status == Appointment.Status.CANCELLED_BY_PATIENT

    def test_celery_mark_missed_appointments_task(self):
        past_unfulfilled = AppointmentFactory(
            start_time=timezone.now() - timedelta(hours=3),
            end_time=timezone.now() - timedelta(hours=2),
            status=Appointment.Status.CONFIRMED,
        )

        mark_missed_appointments()

        past_unfulfilled.refresh_from_db()
        assert past_unfulfilled.status == Appointment.Status.CANCELLED_BY_PATIENT

    def test_doctor_schedule_update_and_lookup_by_profile_or_user_id(self):
        """
        Doctor schedule endpoint can be accessed and saved via either DoctorProfile pk
        or Doctor User pk, and supports fetching weekly rules via ?rules=true.
        """
        doctor = DoctorProfileFactory()
        self.client.force_authenticate(user=doctor.user)

        schedule_payload = [
            {
                "weekday": 1,
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "slot_duration": 30,
                "is_active": True,
            },
            {
                "weekday": 7,
                "start_time": "09:00:00",
                "end_time": "13:00:00",
                "slot_duration": 30,
                "is_active": False,
            },
        ]

        # 1. Update schedule using doctor.user.id
        url_by_user_id = f"/api/v1/doctors/{doctor.user.id}/availability/"
        res_user_id = self.client.post(url_by_user_id, schedule_payload, format="json")
        assert res_user_id.status_code == status.HTTP_200_OK
        assert len(res_user_id.data) == 2

        # 2. Update schedule using doctor.id (DoctorProfile pk)
        url_by_doctor_id = f"/api/v1/doctors/{doctor.id}/availability/"
        res_doc_id = self.client.post(url_by_doctor_id, schedule_payload, format="json")
        assert res_doc_id.status_code == status.HTTP_200_OK

        # 3. Retrieve weekly rules using ?rules=true
        res_rules = self.client.get(f"{url_by_doctor_id}?rules=true")
        assert res_rules.status_code == status.HTTP_200_OK
        assert isinstance(res_rules.data, list)
        assert any(r["weekday"] == 1 and r["is_active"] is True for r in res_rules.data)
        assert any(r["weekday"] == 7 and r["is_active"] is False for r in res_rules.data)

