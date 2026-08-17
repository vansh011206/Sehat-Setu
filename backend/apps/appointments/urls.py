"""
URL patterns for Appointments and Availability.
"""

from django.urls import path
from .views import (
    AppointmentDetailView,
    AppointmentListCreateView,
    CancelAppointmentView,
    CompleteAppointmentView,
    ConfirmAppointmentView,
    DoctorAvailabilityView,
)

app_name = "appointments"

urlpatterns = [
    path("", AppointmentListCreateView.as_view(), name="appointment-list-create"),
    path("<int:pk>/", AppointmentDetailView.as_view(), name="appointment-detail"),
    path("<int:pk>/cancel/", CancelAppointmentView.as_view(), name="appointment-cancel"),
    path("<int:pk>/confirm/", ConfirmAppointmentView.as_view(), name="appointment-confirm"),
    path("<int:pk>/complete/", CompleteAppointmentView.as_view(), name="appointment-complete"),
    path("doctor/<int:pk>/availability/", DoctorAvailabilityView.as_view(), name="doctor-availability"),
]
