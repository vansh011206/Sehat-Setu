"""
Appointment and AvailabilityRule models for SehatSetu slot-booking engine.
"""

import random
import string
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def generate_booking_code() -> str:
    """Generates a unique 8-character booking identifier, e.g. ST-8XK2P3."""
    chars = string.ascii_uppercase + string.digits
    # Exclude confusing characters 0, O, 1, I
    clean_chars = "".join(c for c in chars if c not in "0O1I")
    suffix = "".join(random.choices(clean_chars, k=6))
    return f"ST-{suffix}"


class AvailabilityRule(models.Model):
    """
    Recurring weekly availability rules configured by a doctor.
    Defines working hours and slot granularity for a specific weekday.
    """

    WEEKDAY_CHOICES = (
        (1, "Monday"),
        (2, "Tuesday"),
        (3, "Wednesday"),
        (4, "Thursday"),
        (5, "Friday"),
        (6, "Saturday"),
        (7, "Sunday"),
    )

    SLOT_DURATION_CHOICES = (
        (15, "15 Minutes"),
        (30, "30 Minutes"),
    )

    doctor = models.ForeignKey(
        "doctors.DoctorProfile",
        on_delete=models.CASCADE,
        related_name="availability_rules",
    )
    weekday = models.PositiveSmallIntegerField(
        choices=WEEKDAY_CHOICES,
        help_text="1 for Monday through 7 for Sunday",
    )
    start_time = models.TimeField(help_text="Start of doctor availability (e.g. 09:00)")
    end_time = models.TimeField(help_text="End of doctor availability (e.g. 17:00)")
    slot_duration = models.PositiveSmallIntegerField(
        choices=SLOT_DURATION_CHOICES,
        default=30,
        help_text="Duration per consultation slot in minutes.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Availability Rule"
        verbose_name_plural = "Availability Rules"
        ordering = ["weekday", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "weekday"],
                name="unique_doctor_weekday_availability",
            )
        ]

    def clean(self):
        super().clean()
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "End time must be after start time."})

            start_mins = self.start_time.hour * 60 + self.start_time.minute
            end_mins = self.end_time.hour * 60 + self.end_time.minute
            window = end_mins - start_mins

            if window < self.slot_duration:
                raise ValidationError(
                    {
                        "end_time": f"Total availability window ({window} mins) must be at least one slot duration ({self.slot_duration} mins)."
                    }
                )

    def __str__(self):
        day_name = dict(self.WEEKDAY_CHOICES).get(self.weekday, f"Day {self.weekday}")
        return f"Dr. {self.doctor.user.full_name} - {day_name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class Appointment(models.Model):
    """
    Confirmed or scheduled telehealth consultation or clinic appointment.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Payment"
        CONFIRMED = "CONFIRMED", "Confirmed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED_BY_PATIENT = "CANCELLED_BY_PATIENT", "Cancelled by Patient"
        CANCELLED_BY_DOCTOR = "CANCELLED_BY_DOCTOR", "Cancelled by Doctor"
        MISSED = "MISSED", "Missed"

    doctor = models.ForeignKey(
        "doctors.DoctorProfile",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="appointments_as_patient",
    )
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.CONFIRMED,
        db_index=True,
    )
    cancellation_reason = models.TextField(blank=True)
    fee_at_booking = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Snapshot of consultation fee locked at booking time.",
    )
    booking_code = models.CharField(
        max_length=16,
        unique=True,
        db_index=True,
        help_text="Unique booking reference code (e.g. ST-8XK2P3)",
    )
    symptoms = models.TextField(blank=True, help_text="Patient reported symptoms.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Appointment"
        verbose_name_plural = "Appointments"
        ordering = ["-start_time"]
        indexes = [
            models.Index(fields=["doctor", "start_time", "end_time"]),
            models.Index(fields=["patient", "start_time"]),
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.booking_code:
            code = generate_booking_code()
            while Appointment.objects.filter(booking_code=code).exists():
                code = generate_booking_code()
            self.booking_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_code}: {self.patient.full_name} with Dr. {self.doctor.user.full_name} at {self.start_time.strftime('%Y-%m-%d %H:%M')} ({self.status})"
