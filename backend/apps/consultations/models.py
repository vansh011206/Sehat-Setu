"""
Consultation, ConsultSession, and ConsultMessage models for telehealth sessions.
"""

import uuid
from django.conf import settings
from django.db import models


class Consultation(models.Model):
    """
    Legacy/standard consultation record linked to an appointment.
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


class ConsultSession(models.Model):
    """
    Active live video/audio session linked to an appointment.
    """

    class Status(models.TextChoices):
        WAITING = "WAITING", "Waiting in Lobby"
        ACTIVE = "ACTIVE", "Active Session"
        ENDED = "ENDED", "Ended"

    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="consult_session",
    )
    room_name = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        help_text="Unique Jitsi/WebRTC room name identifier",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
        db_index=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Consult Session"
        verbose_name_plural = "Consult Sessions"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.room_name:
            self.room_name = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f"ConsultSession #{self.id} ({self.status}) for Appt #{self.appointment_id}"


class ConsultMessage(models.Model):
    """
    Persisted real-time chat messages exchanged during consultation.
    """

    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="consult_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consult_messages_sent",
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Consult Message"
        verbose_name_plural = "Consult Messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender.full_name} in Appt #{self.appointment_id}"
