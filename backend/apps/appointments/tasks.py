"""
Celery background tasks for appointments lifecycle.
"""

from celery import shared_task
from django.utils import timezone
from .models import Appointment


@shared_task
def mark_missed_appointments():
    """
    Periodic task to mark uncompleted appointments whose scheduled
    end time has passed as MISSED.
    """
    now = timezone.now()
    count = Appointment.objects.filter(
        end_time__lt=now,
        status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
    ).update(status=Appointment.Status.MISSED)
    return f"Marked {count} overdue appointments as MISSED."
