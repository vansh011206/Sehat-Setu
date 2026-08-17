"""
Comprehensive concurrency, slot-booking, and review validation test suite.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta
from decimal import Decimal
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.doctors.models import DoctorProfile, Specialty


class SlotBookingConcurrencyAndValidationTests(TransactionTestCase):
    """
    Test suite verifying slot booking concurrency safety,
    boundary validation, and review eligibility rules.
    """

    def setUp(self):
        # 1. Specialty & Doctor
        self.specialty = Specialty.objects.create(
            name="Cardiology", slug="cardiology", icon_name="heart-pulse"
        )
        self.doc_user = User.objects.create_user(
            phone="+919876543299",
            full_name="Dr. Test Specialist",
            role=User.Role.DOCTOR,
            password="Demo@1234",
        )
        self.doctor = DoctorProfile.objects.create(
            user=self.doc_user,
            specialty=self.specialty,
            qualification="MBBS, MD",
            city="New Delhi",
            consultation_fee=Decimal("500.00"),
            is_available=True,
        )

        # 2. Setup Availability for all weekdays (09:00 - 17:00, 30min slots)
        for w in range(1, 8):
            AvailabilityRule.objects.create(
                doctor=self.doctor,
                weekday=w,
                start_time=time(9, 0),
                end_time=time(17, 0),
                slot_duration=30,
                is_active=True,
            )

        # 3. Two separate patients for concurrency testing
        self.patient1 = User.objects.create_user(
            phone="+919876543201",
            full_name="Patient One",
            role=User.Role.PATIENT,
            password="Demo@1234",
        )
        self.patient2 = User.objects.create_user(
            phone="+919876543202",
            full_name="Patient Two",
            role=User.Role.PATIENT,
            password="Demo@1234",
        )

    def test_concurrency_two_simultaneous_bookings_exact_one_succeeds(self):
        """
        Runs two parallel thread bookings for the exact same slot.
        Verifies that exactly one receives 201 Created and the other receives 409 Conflict.
        """
        # Tomorrow at 10:00 AM
        tomorrow = timezone.localdate(timezone.now()) + timedelta(days=2)
        slot_start = timezone.make_aware(datetime.combine(tomorrow, time(10, 0)))

        results = []

        def attempt_booking(patient_user):
            client = APIClient()
            client.force_authenticate(user=patient_user)
            resp = client.post(
                "/api/v1/appointments/",
                {
                    "doctor_id": self.doctor.id,
                    "start_time": slot_start.isoformat(),
                    "symptoms": "Concurrency test slot check",
                },
                format="json",
            )
            return resp.status_code, resp.data

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(attempt_booking, self.patient1)
            future2 = executor.submit(attempt_booking, self.patient2)

            res1 = future1.result()
            res2 = future2.result()
            results.extend([res1, res2])

        status_codes = [r[0] for r in results]
        self.assertIn(201, status_codes, "Exactly one booking must succeed with 201 Created.")
        self.assertIn(409, status_codes, "The competing booking must be rejected with 409 Conflict.")

        # Exactly 1 appointment record in database for this slot
        count = Appointment.objects.filter(doctor=self.doctor, start_time=slot_start).count()
        self.assertEqual(count, 1)

    def test_booking_on_arbitrary_time_rejected_with_400(self):
        """
        Booking at 10:17 (not a 30-minute boundary) must return 400 Bad Request.
        """
        tomorrow = timezone.localdate(timezone.now()) + timedelta(days=2)
        arbitrary_start = timezone.make_aware(datetime.combine(tomorrow, time(10, 17)))

        client = APIClient()
        client.force_authenticate(user=self.patient1)
        resp = client.post(
            "/api/v1/appointments/",
            {
                "doctor_id": self.doctor.id,
                "start_time": arbitrary_start.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("slot boundary", str(resp.data).lower())

    def test_patient_overlapping_appointment_rejected_with_400(self):
        """
        Patient booking two appointments overlapping in the same time window must get 400.
        """
        tomorrow = timezone.localdate(timezone.now()) + timedelta(days=2)
        slot_start = timezone.make_aware(datetime.combine(tomorrow, time(11, 0)))

        client = APIClient()
        client.force_authenticate(user=self.patient1)

        # Book first appointment
        resp1 = client.post(
            "/api/v1/appointments/",
            {
                "doctor_id": self.doctor.id,
                "start_time": slot_start.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp1.status_code, 201)

        # Attempt to book another appointment in same window
        resp2 = client.post(
            "/api/v1/appointments/",
            {
                "doctor_id": self.doctor.id,
                "start_time": slot_start.isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("overlapping", str(resp2.data).lower())

    def test_review_requires_completed_appointment(self):
        """
        Patient without a COMPLETED appointment receives 403 Forbidden.
        After completing an appointment, review succeeds with 201.
        Duplicate review returns 409 Conflict.
        """
        client = APIClient()
        client.force_authenticate(user=self.patient1)

        # 1. Review without completed appointment -> 403
        resp = client.post(
            f"/api/v1/doctors/{self.doctor.id}/reviews/",
            {"rating": 5, "review_text": "Great doctor!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

        # 2. Mark appointment as completed
        past_time = timezone.now() - timedelta(days=1)
        Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient1,
            start_time=past_time,
            end_time=past_time + timedelta(minutes=30),
            status=Appointment.Status.COMPLETED,
            fee_at_booking=Decimal("500.00"),
        )

        # 3. Review now succeeds -> 201
        resp2 = client.post(
            f"/api/v1/doctors/{self.doctor.id}/reviews/",
            {"rating": 5, "review_text": "Great doctor!"},
            format="json",
        )
        self.assertEqual(resp2.status_code, 201)

        # 4. Duplicate review -> 409
        resp3 = client.post(
            f"/api/v1/doctors/{self.doctor.id}/reviews/",
            {"rating": 4, "review_text": "Second review attempt"},
            format="json",
        )
        self.assertEqual(resp3.status_code, 409)
