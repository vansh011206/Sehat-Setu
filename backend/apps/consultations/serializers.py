"""
Serializers for Telehealth Consultation sessions, messages, and Jitsi integration.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import ConsultMessage, ConsultSession, Consultation


class ConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = (
            "id",
            "appointment",
            "room_id",
            "status",
            "doctor_notes",
            "started_at",
            "ended_at",
            "created_at",
        )
        read_only_fields = ("id", "room_id", "created_at")


class ConsultSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultSession
        fields = (
            "id",
            "appointment",
            "room_name",
            "status",
            "started_at",
            "ended_at",
            "created_at",
        )
        read_only_fields = ("id", "room_name", "created_at")


class ConsultMessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ConsultMessage
        fields = (
            "id",
            "appointment",
            "sender",
            "text",
            "created_at",
        )
        read_only_fields = ("id", "sender", "created_at")


class StartConsultResponseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    room_name = serializers.CharField()
    status = serializers.CharField()
    started_at = serializers.DateTimeField(allow_null=True)
    jitsi_config = serializers.DictField()


class ConsultStatusResponseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(allow_null=True)
    room_name = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    started_at = serializers.DateTimeField(allow_null=True)
    ended_at = serializers.DateTimeField(allow_null=True)
    appointment_status = serializers.CharField()
    is_doctor = serializers.BooleanField()
    start_window_valid = serializers.BooleanField()
