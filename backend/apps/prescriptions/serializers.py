"""
Serializers for Prescriptions.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from apps.doctors.serializers import DoctorProfileSerializer
from .models import Prescription


class PrescriptionSerializer(serializers.ModelSerializer):
    patient = UserMinimalSerializer(read_only=True)
    doctor = DoctorProfileSerializer(read_only=True)
    patient_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id",
            "consultation",
            "patient",
            "patient_id",
            "doctor",
            "diagnosis",
            "medicines",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "doctor", "created_at", "updated_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if hasattr(user, "doctor_profile"):
            validated_data["doctor"] = user.doctor_profile
        return super().create(validated_data)
