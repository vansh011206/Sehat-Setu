"""
Views for Prescriptions.
"""

from rest_framework import generics, permissions
from apps.accounts.models import User
from .models import Prescription
from .serializers import PrescriptionSerializer


class PrescriptionListCreateView(generics.ListCreateAPIView):
    """
    List prescriptions or issue a new prescription (Doctors only).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Prescription.objects.filter(doctor=user.doctor_profile).select_related(
                "patient", "doctor", "doctor__user"
            )
        elif user.role == User.Role.ADMIN:
            return Prescription.objects.all().select_related(
                "patient", "doctor", "doctor__user"
            )
        return Prescription.objects.filter(patient=user).select_related(
            "patient", "doctor", "doctor__user"
        )


class PrescriptionDetailView(generics.RetrieveAPIView):
    """
    Retrieve prescription details.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Prescription.objects.filter(doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return Prescription.objects.all()
        return Prescription.objects.filter(patient=user)
