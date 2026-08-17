"""
Admin configuration for Appointments and Availability Rules.
"""

from django.contrib import admin
from .models import Appointment, AvailabilityRule


@admin.register(AvailabilityRule)
class AvailabilityRuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "doctor",
        "weekday",
        "start_time",
        "end_time",
        "slot_duration",
        "is_active",
    )
    list_filter = ("weekday", "is_active", "slot_duration")
    search_fields = ("doctor__user__full_name", "doctor__city")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "booking_code",
        "patient",
        "doctor",
        "start_time",
        "end_time",
        "status",
        "fee_at_booking",
        "created_at",
    )
    list_filter = ("status", "start_time")
    search_fields = (
        "booking_code",
        "patient__full_name",
        "patient__phone",
        "doctor__user__full_name",
    )
