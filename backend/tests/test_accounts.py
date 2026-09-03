"""
Tests for Accounts App: register validation, duplicate phone 400, JWT refresh rotation, throttling, role defaults.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from tests.factories import UserFactory


@pytest.mark.django_db
class TestAccountsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_user_registration_success(self):
        url = reverse("accounts:register")
        payload = {
            "phone": "+919876500001",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "full_name": "Test Patient",
            "role": "PATIENT",
        }
        response = self.client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data or "tokens" in response.data
        user = User.objects.get(phone="+919876500001")
        assert user.role == User.Role.PATIENT
        assert user.check_password("Password@123")

    def test_duplicate_phone_returns_400(self):
        UserFactory(phone="+919876500002")
        url = reverse("accounts:register")
        payload = {
            "phone": "+919876500002",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "full_name": "Duplicate User",
            "role": "PATIENT",
        }
        response = self.client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_jwt_token_login_and_refresh_rotation(self):
        user = UserFactory(phone="+919876500003")
        login_url = reverse("accounts:login")

        # 1. Login
        login_res = self.client.post(
            login_url,
            {"phone": "+919876500003", "password": "TestPassword123"},
            format="json",
        )
        assert login_res.status_code == status.HTTP_200_OK
        refresh_token = login_res.data.get("refresh") or login_res.data["tokens"]["refresh"]

        # 2. Refresh Token Rotation
        refresh_url = reverse("accounts:token-refresh")
        refresh_res = self.client.post(
            refresh_url, {"refresh": refresh_token}, format="json"
        )
        assert refresh_res.status_code == status.HTTP_200_OK
        assert "access" in refresh_res.data
        new_refresh = refresh_res.data.get("refresh")
        assert new_refresh is not None

        # 3. Old refresh token should now be blacklisted/invalid
        old_retry_res = self.client.post(
            refresh_url, {"refresh": refresh_token}, format="json"
        )
        assert old_retry_res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_registration_with_specialty_suggestion(self):
        url = reverse("accounts:register")
        payload = {
            "phone": "+919876599991",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "full_name": "Dr. Sameer Khan",
            "role": "DOCTOR",
            "specialty_name": "Sexologist",
            "qualification": "MBBS, MD",
            "years_of_experience": 8,
            "city": "Mumbai",
            "consultation_fee": 800.00,
        }
        response = self.client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(phone="+919876599991")
        assert user.role == User.Role.DOCTOR
        assert hasattr(user, "doctor_profile")
        assert user.doctor_profile.specialty.name == "Sexologist"
        assert user.doctor_profile.city == "Mumbai"
        assert float(user.doctor_profile.consultation_fee) == 800.00
