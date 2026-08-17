"""
Serializers for Appointment booking and Doctor Availability rules.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserMinimalSerializer
from apps.doctors.models import DoctorProfile
from apps.doctors.serializers import DoctorListSerializer
from .models import Appointment, AvailabilityRule


class AvailabilityRuleSerializer(serializers.ModelSerializer):
    """Serializer for recurring weekly availability rule."""

    class Meta:
        model = AvailabilityRule
        fields = (
            "id",
            "weekday",
            "start_time",
            "end_time",
            "slot_duration",
            "is_active",
        )

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        slot_duration = attrs.get("slot_duration", 30)

        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({"end_time": "End time must be after start time."})

            start_mins = start_time.hour * 60 + start_time.minute
            end_mins = end_time.hour * 60 + end_time.minute
            window = end_mins - start_mins

            if window % slot_duration != 0:
                raise serializers.ValidationError(
                    {
                        "slot_duration": f"Total availability window ({window} mins) must be evenly divisible by slot duration ({slot_duration} mins)."
                    }
                )
        return attrs


class SlotSerializer(serializers.Serializer):
    """Representation of an individual 15 or 30 minute consultation slot."""

    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    booked = serializers.BooleanField()
    is_past = serializers.BooleanField()


class DayAvailabilitySerializer(serializers.Serializer):
    """Availability for a single calendar day with generated slots."""

    date = serializers.DateField()
    day_of_week = serializers.IntegerField()
    day_name = serializers.CharField()
    slots = SlotSerializer(many=True)


class BookAppointmentSerializer(serializers.Serializer):
    """Payload serializer for booking an appointment."""

    doctor_id = serializers.IntegerField(required=True)
    start_time = serializers.DateTimeField(required=True)
    symptoms = serializers.CharField(required=False, allow_blank=True, default="")


class CancelAppointmentSerializer(serializers.Serializer):
    """Payload for cancelling an appointment."""

    reason = serializers.CharField(required=True, min_length=3, max_length=500)


class AppointmentSerializer(serializers.ModelSerializer):
    """Detailed appointment serializer."""

    doctor = DoctorListSerializer(read_only=True)
    patient = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "booking_code",
            "doctor",
            "patient",
            "start_time",
            "end_time",
            "status",
            "cancellation_reason",
            "fee_at_booking",
            "symptoms",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "booking_code",
            "doctor",
            "patient",
            "status",
            "cancellation_reason",
            "fee_at_booking",
            "created_at",
            "updated_at",
        )
