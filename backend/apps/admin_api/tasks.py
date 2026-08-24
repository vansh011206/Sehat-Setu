"""
Celery background aggregation tasks for Admin analytics snapshots.
"""

from datetime import datetime, timedelta
from decimal import Decimal
import logging
from celery import shared_task
from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from .models import DailyStats

logger = logging.getLogger(__name__)


@shared_task
def compute_daily_snapshot(target_date_str: str | None = None):
    """
    Computes daily performance metrics for a specific date (or yesterday by default)
    and saves into DailyStats table for high-speed time-series analytics.
    """
    if target_date_str:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    else:
        # Default to today / yesterday snapshot
        target_date = timezone.now().date()

    # 1. Appointments on target_date
    appts = Appointment.objects.filter(start_time__date=target_date)
    bookings_count = appts.count()

    completed_appts = appts.filter(status=Appointment.Status.COMPLETED)
    completed_count = completed_appts.count()
    revenue = (
        completed_appts.aggregate(total=Sum("fee_at_booking"))["total"]
        or Decimal("0.00")
    )

    cancelled_count = appts.filter(
        status__in=[
            Appointment.Status.CANCELLED_BY_PATIENT,
            Appointment.Status.CANCELLED_BY_DOCTOR,
        ]
    ).count()

    missed_count = appts.filter(status=Appointment.Status.MISSED).count()

    # 2. New registrations on target_date
    new_doctors = DoctorProfile.objects.filter(created_at__date=target_date).count()
    new_patients = User.objects.filter(
        role=User.Role.PATIENT, created_at__date=target_date
    ).count()

    stat, created = DailyStats.objects.update_or_create(
        date=target_date,
        defaults={
            "revenue": revenue,
            "bookings_count": bookings_count,
            "completed_count": completed_count,
            "cancelled_count": cancelled_count,
            "missed_count": missed_count,
            "new_doctors": new_doctors,
            "new_patients": new_patients,
        },
    )

    logger.info(
        f"DailyStats computed for {target_date}: Revenue=₹{revenue}, Bookings={bookings_count}, Completed={completed_count} (Created: {created})"
    )
    return {
        "date": str(target_date),
        "revenue": float(revenue),
        "bookings_count": bookings_count,
        "completed_count": completed_count,
    }


def populate_recent_daily_snapshots(days: int = 90):
    """
    Utility helper to backfill DailyStats records for the past N days.
    """
    today = timezone.now().date()
    for i in range(days, -1, -1):
        d = today - timedelta(days=i)
        compute_daily_snapshot(d.strftime("%Y-%m-%d"))
