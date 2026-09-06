"""
Serializers for Role-Based Dashboards and Telemetry in SehatSetu.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from apps.appointments.serializers import AppointmentSerializer
from apps.doctors.serializers import DoctorListSerializer, SpecialtySerializer
from apps.prescriptions.serializers import PrescriptionSerializer


class PatientStatsSerializer(serializers.Serializer):
    total_appointments = serializers.IntegerField()
    upcoming_appointment = AppointmentSerializer(allow_null=True)
    completed_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()
    prescriptions_count = serializers.IntegerField()


class PatientDashboardSerializer(serializers.Serializer):
    stats = PatientStatsSerializer()
    recent_appointments = AppointmentSerializer(many=True)
    recommended_doctors = DoctorListSerializer(many=True)


class ProfileChecklistSerializer(serializers.Serializer):
    items = serializers.DictField(child=serializers.BooleanField())
    percentage = serializers.IntegerField()


class MonthlyMetricSerializer(serializers.Serializer):
    month = serializers.CharField()
    date_key = serializers.CharField()
    count = serializers.IntegerField()
    completed = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=10, decimal_places=2)


class DoctorTodayAppointmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    booking_code = serializers.CharField()
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    status = serializers.CharField()
    fee_at_booking = serializers.DecimalField(max_digits=8, decimal_places=2)
    symptoms = serializers.CharField(allow_blank=True)
    patient = UserMinimalSerializer()


class DoctorDashboardSerializer(serializers.Serializer):
    timeframe = serializers.CharField(required=False, default="today")
    timeframe_label = serializers.CharField(required=False, default="Today")
    today_schedule = DoctorTodayAppointmentSerializer(many=True)
    schedule = DoctorTodayAppointmentSerializer(many=True, required=False)
    upcoming_7_days_count = serializers.IntegerField()
    completed_today_count = serializers.IntegerField()
    total_patients_served = serializers.IntegerField()
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_count = serializers.IntegerField()
    today_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    monthly_appointments = MonthlyMetricSerializer(many=True)
    is_profile_complete = serializers.BooleanField()
    profile_completion_checklist = ProfileChecklistSerializer()


class DoctorPatientSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.CharField(allow_blank=True, allow_null=True)
    gender = serializers.CharField(allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(allow_null=True)
    profile_picture = serializers.SerializerMethodField()
    total_visits = serializers.IntegerField()
    last_visit_date = serializers.DateTimeField(allow_null=True)
    last_status = serializers.CharField(allow_null=True)
    past_appointments = serializers.ListField(child=serializers.DictField())
    prescriptions = serializers.ListField(child=serializers.DictField())

    def get_profile_picture(self, obj) -> str | None:
        request = self.context.get("request")
        pic = obj.get("profile_picture")
        if pic and hasattr(pic, "url"):
            url = pic.url
            return request.build_absolute_uri(url) if request else url
        if isinstance(pic, str) and pic:
            return request.build_absolute_uri(pic) if request else pic
        return None
