"""
URL patterns for Consultations.
"""

from django.urls import path
from .views import ConsultationDetailView, ConsultationListCreateView

app_name = "consultations"

urlpatterns = [
    path("", ConsultationListCreateView.as_view(), name="consultation-list-create"),
    path("<int:pk>/", ConsultationDetailView.as_view(), name="consultation-detail"),
]
