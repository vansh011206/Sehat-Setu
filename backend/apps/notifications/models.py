"""
Notification models for user alerts and updates.
"""

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    User notification for appointments, reminders, and platform alerts.
    """

    class NotificationType(models.TextChoices):
        APPOINTMENT = "APPOINTMENT", "Appointment"
        CONSULTATION = "CONSULTATION", "Consultation"
        PRESCRIPTION = "PRESCRIPTION", "Prescription"
        SYSTEM = "SYSTEM", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    is_read = models.BooleanField(default=False, db_index=True)
    link_url = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name}: {self.title} (Read: {self.is_read})"
