"""
Notification models for user alerts, reminders, and real-time updates.
"""

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    User notification with real-time push and indexed querying.
    """

    class Type(models.TextChoices):
        APPOINTMENT_CONFIRMED = "APPOINTMENT_CONFIRMED", "Appointment Confirmed"
        APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED", "Appointment Cancelled"
        APPOINTMENT_REMINDER = "APPOINTMENT_REMINDER", "Appointment Reminder"
        CONSULT_STARTED = "CONSULT_STARTED", "Consultation Started"
        NEW_PRESCRIPTION = "NEW_PRESCRIPTION", "New Prescription Ready"
        REVIEW_RECEIVED = "REVIEW_RECEIVED", "Review Received"
        PROFILE_INCOMPLETE = "PROFILE_INCOMPLETE", "Profile Incomplete"
        SYSTEM = "SYSTEM", "System Alert"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who receives this notification",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acted_notifications",
        help_text="User who triggered this action (optional)",
    )
    type = models.CharField(
        max_length=50,
        choices=Type.choices,
        default=Type.SYSTEM,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    icon = models.CharField(
        max_length=50,
        default="bell",
        help_text="Lucide icon name (e.g. calendar-check, video, file-text)",
    )
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Arbitrary metadata e.g. {'appointment_id': 2, 'link': '/consult/2'}",
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "created_at"],
                name="notif_recip_read_created_idx",
            ),
        ]

    # Backward compatibility helpers
    @property
    def user(self):
        return self.recipient

    @property
    def notification_type(self):
        return self.type

    def __str__(self):
        return f"{self.recipient.full_name}: {self.title} [{self.type}] (Read: {self.is_read})"
