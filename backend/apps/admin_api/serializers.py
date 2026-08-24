"""
Serializers for Admin Console, Analytics Reports, and System Audit Logs.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from apps.doctors.serializers import SpecialtySerializer
from .models import AuditLog, DailyStats


class OverviewStatsSerializer(serializers.Serializer):
    range = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_growth_pct = serializers.FloatField()
    total_appointments = serializers.IntegerField()
    appointments_growth_pct = serializers.FloatField()
    completed_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()
    missed_count = serializers.IntegerField()
    active_doctors = serializers.IntegerField()
    doctors_growth_pct = serializers.FloatField()
    active_patients = serializers.IntegerField()
    patients_growth_pct = serializers.FloatField()
    new_users_this_period = serializers.IntegerField()


class RevenueTrendItemSerializer(serializers.Serializer):
    date = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    bookings = serializers.IntegerField()
    completed = serializers.IntegerField()


class AppointmentsByStatusItemSerializer(serializers.Serializer):
    status = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()
    color = serializers.CharField()


class TopDoctorStatsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    photo = serializers.CharField(allow_null=True)
    specialty = serializers.CharField()
    city = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)


class SpecialtyDemandSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    bookings_count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    doctor_count = serializers.IntegerField()


class AdminDoctorTableSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.CharField()
    specialty = serializers.CharField()
    qualification = serializers.CharField()
    city = serializers.CharField()
    fee = serializers.DecimalField(max_digits=8, decimal_places=2)
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_count = serializers.IntegerField()
    is_available = serializers.BooleanField()
    is_active = serializers.BooleanField()
    appointments_count = serializers.IntegerField()
    joined = serializers.CharField()


class AdminPatientTableSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.CharField()
    appointments_count = serializers.IntegerField()
    total_spent = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_active = serializers.BooleanField()
    joined = serializers.CharField()
    last_appointment_date = serializers.CharField(allow_null=True)


class AdminAppointmentTableSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    booking_code = serializers.CharField()
    doctor = serializers.DictField()
    patient = serializers.DictField()
    status = serializers.CharField()
    fee = serializers.DecimalField(max_digits=8, decimal_places=2)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    symptoms = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_name",
            "actor_role",
            "action",
            "target_model",
            "target_id",
            "description",
            "changes",
            "ip_address",
            "created_at",
        )
        read_only_fields = fields

    def get_actor_name(self, obj) -> str:
        return obj.actor.full_name if obj.actor else "System"

    def get_actor_role(self, obj) -> str:
        return obj.actor.role if obj.actor else "SYSTEM"
