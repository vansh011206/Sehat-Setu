"""
URL routing for role-based dashboards and telemetry.
"""

from django.urls import path
from .views import (
    DoctorDashboardView,
    DoctorPatientsListView,
    PatientDashboardView,
)

app_name = "dashboard"

urlpatterns = [
    path("patient/", PatientDashboardView.as_view(), name="patient-dashboard"),
    path("doctor/", DoctorDashboardView.as_view(), name="doctor-dashboard"),
]
