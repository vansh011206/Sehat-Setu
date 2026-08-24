"""
URL patterns for Prescriptions.
"""

from django.urls import path
from .views import (
    DoctorPrescriptionsListView,
    PatientPrescriptionsListView,
    PrescriptionDetailView,
    PrescriptionPDFDownloadView,
    VerifyPrescriptionView,
)

app_name = "prescriptions"

urlpatterns = [
    path("<int:pk>/", PrescriptionDetailView.as_view(), name="prescription-detail"),
    path("<int:pk>/download/", PrescriptionPDFDownloadView.as_view(), name="prescription-download"),
]
