"""
Models for Daily aggregated analytics snapshots and System audit logs.
"""

from decimal import Decimal
from django.conf import settings
from django.db import models


class DailyStats(models.Model):
    """
    Precomputed daily performance and volume snapshot for fast time-series queries.
    Populated nightly by Celery beat.
    """

    date = models.DateField(unique=True, db_index=True)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    bookings_count = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)
    cancelled_count = models.IntegerField(default=0)
    missed_count = models.IntegerField(default=0)
    new_doctors = models.IntegerField(default=0)
    new_patients = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Daily Stat Snapshot"
        verbose_name_plural = "Daily Stats Snapshots"
        ordering = ["-date"]

    def __str__(self):
        return f"DailyStats for {self.date}: Revenue ₹{self.revenue}, Bookings {self.bookings_count}"


class AuditLog(models.Model):
    """
    Security and administrative audit trail recording administrative actions,
    status overrides, availability toggles, and sensitive events.
    """

    class Action(models.TextChoices):
        DOCTOR_AVAILABILITY_TOGGLE = "DOCTOR_AVAILABILITY_TOGGLE", "Doctor Availability Toggled"
        DOCTOR_STATUS_UPDATE = "DOCTOR_STATUS_UPDATE", "Doctor Status Updated"
        DOCTOR_DEACTIVATED = "DOCTOR_DEACTIVATED", "Doctor Account Deactivated"
        DOCTOR_ACTIVATED = "DOCTOR_ACTIVATED", "Doctor Account Reactivated"
        APPOINTMENT_STATUS_OVERRIDE = "APPOINTMENT_STATUS_OVERRIDE", "Appointment Status Override"
        USER_ROLE_CHANGED = "USER_ROLE_CHANGED", "User Role Changed"
        ADMIN_SETTING_CHANGED = "ADMIN_SETTING_CHANGED", "Admin Setting Changed"
        USER_LOGIN = "USER_LOGIN", "User Login"
        SYSTEM_ACTION = "SYSTEM_ACTION", "System Automated Action"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100, db_index=True)
    target_model = models.CharField(max_length=100, blank=True, db_index=True)
    target_id = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    changes = models.JSONField(default=dict, blank=True, help_text="Before and After state diff")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["target_model", "target_id"]),
        ]

    def __str__(self):
        actor_name = self.actor.full_name if self.actor else "System"
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {actor_name} -> {self.action} ({self.target_model}:{self.target_id})"


def log_audit(
    actor,
    action: str,
    target_model: str = "",
    target_id: str | int = "",
    description: str = "",
    changes: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Helper utility for creating audit log entries."""
    if changes is None:
        changes = {}
    return AuditLog.objects.create(
        actor=actor if (actor and actor.is_authenticated) else None,
        action=action,
        target_model=target_model,
        target_id=str(target_id) if target_id else "",
        description=description,
        changes=changes,
        ip_address=ip_address,
    )
