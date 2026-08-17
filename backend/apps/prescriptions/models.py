"""
Prescription models for digital health records.
"""

from django.conf import settings
from django.db import models


class Prescription(models.Model):
    """
    Digital prescription issued by a verified doctor to a patient.
    """

    consultation = models.ForeignKey(
        "consultations.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    doctor = models.ForeignKey(
        "doctors.DoctorProfile",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    diagnosis = models.CharField(max_length=255)
    medicines = models.JSONField(
        default=list,
        help_text="List of dicts: [{'name': 'Paracetamol', 'dosage': '500mg', 'frequency': '1-0-1', 'duration': '5 days', 'instructions': 'After food'}]",
    )
    notes = models.TextField(blank=True, help_text="Special precautions or lifestyle advice.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Rx for {self.patient.full_name} by Dr. {self.doctor.user.full_name} ({self.diagnosis})"
