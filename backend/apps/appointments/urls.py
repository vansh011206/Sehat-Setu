"""
URL patterns for Appointments and Availability.
"""

from django.urls import path
from apps.consultations.views import (
    ConsultMessagesListView,
    ConsultStatusView,
    EndConsultView,
    StartConsultView,
)
from .views import (
    AppointmentDetailView,
    AppointmentListCreateView,
    CancelAppointmentView,
    CompleteAppointmentView,
    ConfirmAppointmentView,
    DoctorAvailabilityView,
)

from apps.prescriptions.views import (
    AppointmentPrescriptionView,
    CreateAppointmentPrescriptionView,
)

app_name = "appointments"

urlpatterns = [
    path("", AppointmentListCreateView.as_view(), name="appointment-list-create"),
    path("<int:pk>/", AppointmentDetailView.as_view(), name="appointment-detail"),
    path("<int:pk>/cancel/", CancelAppointmentView.as_view(), name="appointment-cancel"),
    path("<int:pk>/confirm/", ConfirmAppointmentView.as_view(), name="appointment-confirm"),
    path("<int:pk>/complete/", CompleteAppointmentView.as_view(), name="appointment-complete"),
    path("doctor/<int:pk>/availability/", DoctorAvailabilityView.as_view(), name="doctor-availability"),
    # Telehealth Video & Chat Endpoints
    path("<int:pk>/consult/start/", StartConsultView.as_view(), name="consult-start"),
    path("<int:pk>/consult/end/", EndConsultView.as_view(), name="consult-end"),
    path("<int:pk>/consult/status/", ConsultStatusView.as_view(), name="consult-status"),
    path("<int:pk>/messages/", ConsultMessagesListView.as_view(), name="consult-messages"),
    # e-Prescription Endpoints
    path("<int:pk>/prescriptions/", CreateAppointmentPrescriptionView.as_view(), name="appointment-prescription-create"),
    path("<int:pk>/prescription/", AppointmentPrescriptionView.as_view(), name="appointment-prescription-detail"),
]

