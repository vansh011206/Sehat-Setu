"""
URL patterns for Admin Console & Analytics API.
"""

from django.urls import path
from .views import (
    AdminAppointmentStatusOverrideView,
    AdminAppointmentsByStatusView,
    AdminAppointmentsListView,
    AdminAuditLogsListView,
    AdminDoctorDetailView,
    AdminDoctorsListView,
    AdminOverviewStatsView,
    AdminPatientAppointmentsView,
    AdminPatientsListView,
    AdminRevenueTrendView,
    AdminSpecialtyDemandView,
    AdminTopDoctorsView,
)

app_name = "admin_api"

urlpatterns = [
    # Analytics & Reports
    path("stats/overview/", AdminOverviewStatsView.as_view(), name="stats-overview"),
    path("stats/revenue-trend/", AdminRevenueTrendView.as_view(), name="stats-revenue-trend"),
    path("stats/appointments-by-status/", AdminAppointmentsByStatusView.as_view(), name="stats-appointments-status"),
    path("stats/top-doctors/", AdminTopDoctorsView.as_view(), name="stats-top-doctors"),
    path("stats/specialty-demand/", AdminSpecialtyDemandView.as_view(), name="stats-specialty-demand"),

    # Management
    path("doctors/", AdminDoctorsListView.as_view(), name="admin-doctors-list"),
    path("doctors/<int:pk>/", AdminDoctorDetailView.as_view(), name="admin-doctor-detail"),
    path("patients/", AdminPatientsListView.as_view(), name="admin-patients-list"),
    path("patients/<int:pk>/appointments/", AdminPatientAppointmentsView.as_view(), name="admin-patient-appointments"),
    path("appointments/", AdminAppointmentsListView.as_view(), name="admin-appointments-list"),
    path("appointments/<int:pk>/", AdminAppointmentStatusOverrideView.as_view(), name="admin-appointment-override"),

    # Security & Audit
    path("audit-logs/", AdminAuditLogsListView.as_view(), name="admin-audit-logs"),
]
