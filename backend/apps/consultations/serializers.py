"""
Serializers for Consultations.
"""

from rest_framework import serializers
from apps.appointments.serializers import AppointmentSerializer
from .models import Consultation


class ConsultationSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    appointment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Consultation
        fields = (
            "id",
            "appointment",
            "appointment_id",
            "room_id",
            "status",
            "doctor_notes",
            "started_at",
            "ended_at",
            "created_at",
        )
        read_only_fields = ("id", "room_id", "created_at")
