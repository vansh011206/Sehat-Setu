"""
Tests for Doctors App: search/filter/sort, review permission (completed only), rating aggregation, duplicate review.
"""

from decimal import Decimal
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.appointments.models import Appointment
from apps.doctors.models import Review
from tests.factories import (
    AppointmentFactory,
    DoctorProfileFactory,
    SpecialtyFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestDoctorsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_doctor_search_and_filters(self):
        cardio = SpecialtyFactory(name="Cardiology")
        doc1 = DoctorProfileFactory(specialty=cardio, city="New Delhi", consultation_fee=800)
        doc2 = DoctorProfileFactory(city="Mumbai", consultation_fee=500)

        url = reverse("doctors:doctor-list")
        res = self.client.get(url, {"search": "Delhi"})
        assert res.status_code == status.HTTP_200_OK
        results = res.data["results"] if "results" in res.data else res.data
        assert any(d["id"] == doc1.id for d in results)
        assert not any(d["id"] == doc2.id for d in results)

    def test_review_permission_completed_appointment_only(self):
        patient = UserFactory()
        doctor = DoctorProfileFactory()
        self.client.force_authenticate(user=patient)

        url = reverse("doctors:doctor-reviews", kwargs={"pk": doctor.id})

        # 1. Uncompleted appointment -> 403 Forbidden to leave review
        AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.CONFIRMED
        )
        res_fail = self.client.post(url, {"rating": 5, "review_text": "Great doctor"}, format="json")
        assert res_fail.status_code == status.HTTP_403_FORBIDDEN

        # 2. Completed appointment -> 201 Created
        AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )
        res_success = self.client.post(url, {"rating": 5, "review_text": "Great doctor"}, format="json")
        assert res_success.status_code == status.HTTP_201_CREATED
        assert Review.objects.filter(doctor=doctor, patient=patient).exists()

    def test_duplicate_review_returns_409(self):
        patient = UserFactory()
        doctor = DoctorProfileFactory()
        AppointmentFactory(
            doctor=doctor, patient=patient, status=Appointment.Status.COMPLETED
        )
        self.client.force_authenticate(user=patient)

        url = reverse("doctors:doctor-reviews", kwargs={"pk": doctor.id})
        res1 = self.client.post(url, {"rating": 5, "review_text": "First review"}, format="json")
        assert res1.status_code == status.HTTP_201_CREATED

        # Duplicate review attempt
        res2 = self.client.post(url, {"rating": 4, "review_text": "Second review"}, format="json")
        assert res2.status_code == status.HTTP_409_CONFLICT

    def test_doctor_rating_aggregation_correctness(self):
        doctor = DoctorProfileFactory()
        patient1 = UserFactory()
        patient2 = UserFactory()

        AppointmentFactory(doctor=doctor, patient=patient1, status=Appointment.Status.COMPLETED)
        AppointmentFactory(doctor=doctor, patient=patient2, status=Appointment.Status.COMPLETED)

        Review.objects.create(doctor=doctor, patient=patient1, rating=5, review_text="Excellent")
        Review.objects.create(doctor=doctor, patient=patient2, rating=3, review_text="Average")

        doctor.refresh_from_db()
        assert doctor.avg_rating == Decimal("4.00")
        assert doctor.rating_count == 2
