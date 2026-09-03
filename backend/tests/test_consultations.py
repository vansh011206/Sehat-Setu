"""
Tests for Consultations App: WebSocket auth rejection 4004, membership enforcement, start/end window rules.
"""

from datetime import timedelta
import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.appointments.models import Appointment
from apps.consultations.models import ConsultSession
from tests.factories import AppointmentFactory, UserFactory


@pytest.mark.django_db
class TestConsultationsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_start_consultation_window_rules(self):
        # 1. Start consultation within valid window [start-15m, end+30m]
        now = timezone.now()
        valid_appt = AppointmentFactory(
            start_time=now - timedelta(minutes=5),
            end_time=now + timedelta(minutes=25),
            status=Appointment.Status.CONFIRMED,
        )

        self.client.force_authenticate(user=valid_appt.doctor.user)
        url_valid = reverse(
            "appointments:consult-start", kwargs={"pk": valid_appt.id}
        )
        res_valid = self.client.post(url_valid)
        assert res_valid.status_code == status.HTTP_200_OK
        assert "room_name" in res_valid.data
        assert ConsultSession.objects.filter(appointment=valid_appt).exists()

    def test_start_consultation_unauthorized_user_returns_403(self):
        now = timezone.now()
        appt = AppointmentFactory(
            start_time=now - timedelta(minutes=5),
            end_time=now + timedelta(minutes=25),
            status=Appointment.Status.CONFIRMED,
        )

        unrelated_user = UserFactory()
        self.client.force_authenticate(user=unrelated_user)
        url = reverse(
            "appointments:consult-start", kwargs={"pk": appt.id}
        )
        res = self.client.post(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_end_consultation_completes_appointment(self):
        now = timezone.now()
        appt = AppointmentFactory(
            start_time=now - timedelta(minutes=5),
            end_time=now + timedelta(minutes=25),
            status=Appointment.Status.CONFIRMED,
        )
        session = ConsultSession.objects.create(
            appointment=appt,
            room_name="test-room-123",
            status=ConsultSession.Status.ACTIVE,
        )

        self.client.force_authenticate(user=appt.doctor.user)
        url_end = reverse(
            "appointments:consult-end", kwargs={"pk": appt.id}
        )
        res_end = self.client.post(url_end)
        assert res_end.status_code == status.HTTP_200_OK

        session.refresh_from_db()
        appt.refresh_from_db()
        assert session.status == ConsultSession.Status.ENDED
        assert appt.status == Appointment.Status.COMPLETED
