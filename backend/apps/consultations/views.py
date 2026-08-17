"""
Views for Consultations.
"""

from rest_framework import generics, permissions
from apps.accounts.models import User
from .models import Consultation
from .serializers import ConsultationSerializer


class ConsultationListCreateView(generics.ListCreateAPIView):
    """
    List or create consultation sessions.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Consultation.objects.filter(appointment__doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return Consultation.objects.all()
        return Consultation.objects.filter(appointment__patient=user)


class ConsultationDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update consultation status and room notes.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Consultation.objects.filter(appointment__doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return Consultation.objects.all()
        return Consultation.objects.filter(appointment__patient=user)
