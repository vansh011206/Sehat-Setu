"""
Consultation models for telehealth video/audio sessions.
"""

import uuid
from django.db import models


class Consultation(models.Model):
    """
    Telehealth consultation session linked to an appointment.
    """

    class Status(models.TextChoices):
        WAITING = "WAITING", "Waiting in Lobby"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        MISSED = "MISSED", "Missed"

    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="consultation",
    )
    room_id = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        help_text="Unique WebRTC or video room identifier",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
    )
    doctor_notes = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.room_id:
            self.room_id = f"room-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Consultation #{self.id} for Appointment #{self.appointment_id}"
