"""
Prescription models for digital health records and verified e-prescriptions.
"""

import random
import string
from django.conf import settings
from django.db import models


def generate_verification_code() -> str:
    """Generate a unique 10-char alphanumeric verification code (e.g., SHTS-8XK2PL3)"""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=7))
    return f"SHTS-{suffix}"


class Prescription(models.Model):
    """
    Digital e-prescription issued by a registered doctor to a patient for an appointment.
    """

    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="prescription",
        null=True,
        blank=True,
    )
    consultation = models.ForeignKey(
        "consultations.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    doctor = models.ForeignKey(
        "doctors.DoctorProfile",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    diagnosis = models.TextField(help_text="Clinical diagnosis or primary reason for prescription")
    medicines = models.JSONField(
        default=list,
        help_text="List of dicts: [{'name': 'Paracetamol', 'dosage': '650mg', 'frequency': '1-0-1', 'duration': '5 days', 'instructions': 'After food'}]",
    )
    advice = models.TextField(blank=True, help_text="Special precautions, diet, or lifestyle advice.")
    follow_up_in_days = models.PositiveIntegerField(null=True, blank=True, help_text="Recommended follow-up in days")
    verification_code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        blank=True,
        help_text="Unique verification code for public authenticity validation",
    )
    pdf_file = models.FileField(upload_to="prescriptions/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.verification_code:
            code = generate_verification_code()
            while Prescription.objects.filter(verification_code=code).exists():
                code = generate_verification_code()
            self.verification_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Rx {self.verification_code} for {self.patient.full_name} by Dr. {self.doctor.user.full_name}"
