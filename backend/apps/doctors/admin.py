"""
Admin configuration for DoctorProfile, Specialty, and Review.
"""

from django.contrib import admin
from .models import DoctorProfile, Review, Specialty


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "icon_name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "doctor_name",
        "specialty",
        "qualification",
        "city",
        "consultation_fee",
        "avg_rating",
        "rating_count",
        "is_available",
    )
    list_filter = ("specialty", "city", "is_available")
    search_fields = (
        "user__full_name",
        "user__phone",
        "clinic_name",
        "qualification",
        "city",
    )
    raw_id_fields = ("user",)

    def doctor_name(self, obj):
        return obj.user.full_name

    doctor_name.short_description = "Doctor Name"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "doctor", "patient", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("doctor__user__full_name", "patient__full_name", "review_text")
