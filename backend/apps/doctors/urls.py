"""
URL patterns for Doctors, Specialties, Reviews, and Doctor Availability.
"""

from django.urls import path
from apps.appointments.views import DoctorAvailabilityView
from .views import (
    DoctorDetailView,
    DoctorListView,
    DoctorReviewsListCreateView,
    SpecialtyListView,
)

app_name = "doctors"

urlpatterns = [
    path("specialties/", SpecialtyListView.as_view(), name="specialty-list"),
    path("", DoctorListView.as_view(), name="doctor-list"),
    path("<int:pk>/", DoctorDetailView.as_view(), name="doctor-detail"),
    path("<int:pk>/reviews/", DoctorReviewsListCreateView.as_view(), name="doctor-reviews"),
    path("<int:pk>/availability/", DoctorAvailabilityView.as_view(), name="doctor-availability"),
]
