"""
URL patterns for Consultations app.
"""

from django.urls import path
from .views import (
    ConsultMessagesListView,
    ConsultStatusView,
    ConsultationDetailView,
    ConsultationListCreateView,
    EndConsultView,
    StartConsultView,
)

app_name = "consultations"

urlpatterns = [
    path("", ConsultationListCreateView.as_view(), name="consultation-list-create"),
    path("<int:pk>/", ConsultationDetailView.as_view(), name="consultation-detail"),
    path("appointment/<int:pk>/start/", StartConsultView.as_view(), name="appointment-consult-start"),
    path("appointment/<int:pk>/end/", EndConsultView.as_view(), name="appointment-consult-end"),
    path("appointment/<int:pk>/status/", ConsultStatusView.as_view(), name="appointment-consult-status"),
    path("appointment/<int:pk>/messages/", ConsultMessagesListView.as_view(), name="appointment-consult-messages"),
]
