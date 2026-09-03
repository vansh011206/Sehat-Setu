"""
Tests for Admin API App: 403 for non-admin, overview stats math, audit log creation.
"""

from decimal import Decimal
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.admin_api.models import AuditLog, log_audit
from tests.factories import (
    AdminUserFactory,
    AppointmentFactory,
    DoctorUserFactory,
    UserFactory,
)
from apps.appointments.models import Appointment


@pytest.mark.django_db
class TestAdminAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_non_admin_gets_403(self):
        patient = UserFactory()
        doctor_user = DoctorUserFactory()

        url = reverse("admin_api:stats-overview")

        # 1. Patient gets 403
        self.client.force_authenticate(user=patient)
        res_patient = self.client.get(url)
        assert res_patient.status_code == status.HTTP_403_FORBIDDEN

        # 2. Doctor gets 403
        self.client.force_authenticate(user=doctor_user)
        res_doctor = self.client.get(url)
        assert res_doctor.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_overview_stats_math(self):
        admin = AdminUserFactory()
        self.client.force_authenticate(user=admin)

        # Seed completed appointments
        AppointmentFactory(
            fee_at_booking=Decimal("800.00"), status=Appointment.Status.COMPLETED
        )
        AppointmentFactory(
            fee_at_booking=Decimal("600.00"), status=Appointment.Status.COMPLETED
        )

        url = reverse("admin_api:stats-overview")
        res = self.client.get(url, {"range": "30d"})
        assert res.status_code == status.HTTP_200_OK
        assert float(res.data["total_revenue"]) == 1400.00
        assert res.data["completed_count"] == 2

    def test_audit_log_entry_creation_and_listing(self):
        admin = AdminUserFactory()
        log_audit(
            actor=admin,
            action=AuditLog.Action.DOCTOR_AVAILABILITY_TOGGLE,
            target_model="DoctorProfile",
            target_id=1,
            description="Toggled availability for Dr. Test",
            changes={"is_available": {"before": True, "after": False}},
        )

        self.client.force_authenticate(user=admin)
        url = reverse("admin_api:admin-audit-logs")
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] >= 1
        first_log = res.data["results"][0]
        assert first_log["action"] == AuditLog.Action.DOCTOR_AVAILABILITY_TOGGLE
        assert first_log["actor_name"] == admin.full_name
