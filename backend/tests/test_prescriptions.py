"""
Tests for Prescriptions App: doctor-only creation, 404 for others, ReportLab PDF generation, verification code.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.appointments.models import Appointment
from apps.prescriptions.models import Prescription
from apps.prescriptions.pdf_generator import generate_prescription_pdf
from tests.factories import AppointmentFactory, UserFactory, DoctorProfileFactory


@pytest.mark.django_db
class TestPrescriptionsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_doctor_can_create_prescription(self):
        doctor = DoctorProfileFactory()
        patient = UserFactory()
        appt = AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )

        self.client.force_authenticate(user=doctor.user)
        url = reverse(
            "appointments:appointment-prescription-create",
            kwargs={"pk": appt.id},
        )
        payload = {
            "diagnosis": "Primary Hypertension",
            "medicines": [
                {
                    "name": "Telmisartan",
                    "dosage": "40 mg",
                    "frequency": "Once daily",
                    "duration": "30 Days",
                    "instructions": "After breakfast",
                }
            ],
            "advice": "Low salt diet",
            "follow_up_in_days": 30,
        }
        res = self.client.post(url, payload, format="json")
        assert res.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)
        assert Prescription.objects.filter(appointment=appt).exists()
        rx = Prescription.objects.get(appointment=appt)
        assert rx.verification_code.startswith("SHTS-")

    def test_patient_cannot_create_prescription_returns_403(self):
        doctor = DoctorProfileFactory()
        patient = UserFactory()
        appt = AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )

        self.client.force_authenticate(user=patient)
        url = reverse(
            "appointments:appointment-prescription-create",
            kwargs={"pk": appt.id},
        )
        payload = {
            "diagnosis": "Self diagnosed",
            "medicines": [],
            "advice": "None",
        }
        res = self.client.post(url, payload, format="json")
        assert res.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_pdf_generation_smoke_test(self):
        doctor = DoctorProfileFactory()
        patient = UserFactory()
        appt = AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )
        rx = Prescription.objects.create(
            appointment=appt,
            doctor=doctor,
            patient=patient,
            diagnosis="Routine Health Check",
            medicines=[
                {
                    "name": "Multivitamin",
                    "dosage": "1 Tab",
                    "frequency": "Once daily",
                    "duration": "10 Days",
                    "instructions": "After lunch",
                }
            ],
            advice="Drink plenty of water",
        )

        pdf_file = generate_prescription_pdf(rx)
        assert pdf_file is not None
        pdf_bytes = pdf_file.read()
        assert len(pdf_bytes) > 500
        assert pdf_bytes.startswith(b"%PDF")

    def test_public_verification_code_lookup(self):
        doctor = DoctorProfileFactory()
        patient = UserFactory()
        appt = AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )
        rx = Prescription.objects.create(
            appointment=appt,
            doctor=doctor,
            patient=patient,
            diagnosis="Routine Check",
            medicines=[],
        )
        rx.refresh_from_db()

        url = reverse("prescription-verify", kwargs={"code": rx.verification_code})
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["valid"] is True
        assert res.data["doctor_name"] == f"Dr. {doctor.user.full_name}"
