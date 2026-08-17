"""
Admin configuration for Prescriptions.
"""

from django.contrib import admin
from .models import Prescription


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor", "diagnosis", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "patient__full_name",
        "doctor__user__full_name",
        "diagnosis",
    )
