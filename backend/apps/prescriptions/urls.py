"""
URL patterns for Prescriptions.
"""

from django.urls import path
from .views import PrescriptionDetailView, PrescriptionListCreateView

app_name = "prescriptions"

urlpatterns = [
    path("", PrescriptionListCreateView.as_view(), name="prescription-list-create"),
    path("<int:pk>/", PrescriptionDetailView.as_view(), name="prescription-detail"),
]
