"""
Admin configuration for Consultations.
"""

from django.contrib import admin
from .models import Consultation


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("id", "appointment", "room_id", "status", "started_at", "ended_at")
    list_filter = ("status", "created_at")
    search_fields = ("room_id", "appointment__patient__full_name")
