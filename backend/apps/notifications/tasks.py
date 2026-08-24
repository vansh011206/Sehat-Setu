"""
Celery tasks for automated appointment reminders, missed session cleanups, and nightly stats.
"""

from datetime import timedelta
import logging
import os
from celery import shared_task
from django.utils import timezone
from apps.appointments.models import Appointment
from .models import Notification
from .services import NotificationService

logger = logging.getLogger(__name__)


@shared_task
def send_appointment_reminders_15min():
    """
    Finds appointments starting in ~15 minutes (between 10 and 20 mins from now)
    that are CONFIRMED/PENDING and haven't received a 15min reminder yet.
    """
    now = timezone.now()
    window_start = now + timedelta(minutes=10)
    window_end = now + timedelta(minutes=20)

    appointments = Appointment.objects.filter(
        start_time__gte=window_start,
        start_time__lte=window_end,
        status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
    ).select_related("doctor", "doctor__user", "patient")

    processed = 0
    for appt in appointments:
        # Check if already notified for 15min reminder
        already_notified = Notification.objects.filter(
            recipient=appt.patient,
            type=Notification.Type.APPOINTMENT_REMINDER,
            data__appointment_id=appt.id,
            data__reminder_type="15min",
        ).exists()

        if not already_notified:
            time_str = appt.start_time.strftime("%I:%M %p")
            doc_name = f"Dr. {appt.doctor.user.full_name}"

            # 1. Notify Patient
            NotificationService.create_notification(
                recipient=appt.patient,
                actor=appt.doctor.user,
                title="Appointment Starting in 15 Minutes",
                message=f"Your consultation with {doc_name} begins at {time_str}. Please join the waiting room.",
                notification_type=Notification.Type.APPOINTMENT_REMINDER,
                icon="clock",
                data={
                    "appointment_id": appt.id,
                    "reminder_type": "15min",
                    "link": f"/consult/{appt.id}",
                },
                send_email=True,
                email_subject=f"15-Minute Reminder: Consultation with {doc_name}",
                email_headline="Your Consultation Starts Shortly",
                email_meta={
                    "Doctor": doc_name,
                    "Scheduled Time": time_str,
                    "Booking Ref": appt.booking_code,
                },
                action_text="Enter Consultation Room",
                action_url=f"http://localhost:5173/consult/{appt.id}",
            )

            # 2. Notify Doctor
            NotificationService.create_notification(
                recipient=appt.doctor.user,
                actor=appt.patient,
                title="Appointment in 15 Minutes",
                message=f"Upcoming consultation with {appt.patient.full_name} at {time_str}.",
                notification_type=Notification.Type.APPOINTMENT_REMINDER,
                icon="clock",
                data={
                    "appointment_id": appt.id,
                    "reminder_type": "15min",
                    "link": f"/consult/{appt.id}",
                },
                send_email=True,
                email_subject=f"Upcoming Patient in 15m: {appt.patient.full_name}",
                email_headline="Upcoming Consultation Reminder",
                email_meta={
                    "Patient": appt.patient.full_name,
                    "Scheduled Time": time_str,
                    "Booking Ref": appt.booking_code,
                },
                action_text="Open Consultation Room",
                action_url=f"http://localhost:5173/consult/{appt.id}",
            )
            processed += 1

    logger.info(f"15-min reminder task completed. Processed {processed} appointments.")
    return f"Processed {processed} 15-min reminders."


@shared_task
def send_appointment_reminders_3h():
    """
    Finds appointments starting in ~3 hours (between 2h45m and 3h15m from now).
    Sends email + logs SMS dispatch stub.
    """
    now = timezone.now()
    window_start = now + timedelta(hours=2, minutes=45)
    window_end = now + timedelta(hours=3, minutes=15)

    appointments = Appointment.objects.filter(
        start_time__gte=window_start,
        start_time__lte=window_end,
        status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
    ).select_related("doctor", "doctor__user", "patient")

    processed = 0
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")

    for appt in appointments:
        already_notified = Notification.objects.filter(
            recipient=appt.patient,
            type=Notification.Type.APPOINTMENT_REMINDER,
            data__appointment_id=appt.id,
            data__reminder_type="3h",
        ).exists()

        if not already_notified:
            time_str = appt.start_time.strftime("%I:%M %p")
            doc_name = f"Dr. {appt.doctor.user.full_name}"

            # Notify Patient
            NotificationService.create_notification(
                recipient=appt.patient,
                actor=appt.doctor.user,
                title="Appointment Reminder: 3 Hours Away",
                message=f"Reminder: You have a scheduled appointment with {doc_name} today at {time_str}.",
                notification_type=Notification.Type.APPOINTMENT_REMINDER,
                icon="clock",
                data={
                    "appointment_id": appt.id,
                    "reminder_type": "3h",
                    "link": f"/consult/{appt.id}",
                },
                send_email=True,
                email_subject=f"Appointment Today at {time_str} - {doc_name}",
                email_headline="Upcoming Consultation Reminder",
                email_meta={
                    "Doctor": doc_name,
                    "Time": time_str,
                    "Booking Ref": appt.booking_code,
                },
                action_text="View Details",
                action_url=f"http://localhost:5173/appointments",
            )

            # Optional SMS Stub
            if twilio_sid:
                logger.info(f"Twilio SMS sent to {appt.patient.phone}: Appointment with {doc_name} at {time_str}")
            else:
                logger.info(f"[SMS STUB] To: {appt.patient.phone} | SehatSetu Reminder: Appointment with {doc_name} at {time_str}.")

            processed += 1

    logger.info(f"3-hour reminder task completed. Processed {processed} appointments.")
    return f"Processed {processed} 3-hour reminders."


@shared_task
def mark_missed_appointments():
    """
    Hourly cleanup task: Marks past unfulfilled appointments as CANCELLED (missed)
    and notifies both patient and doctor.
    """
    now = timezone.now()
    threshold = now - timedelta(minutes=45)

    past_appointments = Appointment.objects.filter(
        end_time__lt=threshold,
        status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
    ).select_related("doctor", "doctor__user", "patient")

    count = 0
    for appt in past_appointments:
        appt.status = Appointment.Status.CANCELLED_BY_PATIENT
        appt.cancellation_reason = "System Auto-Cancellation: Missed consultation window."
        appt.save(update_fields=["status", "cancellation_reason", "updated_at"])

        # Notify Patient
        NotificationService.create_notification(
            recipient=appt.patient,
            title="Missed Appointment Notice",
            message=f"Your appointment with Dr. {appt.doctor.user.full_name} scheduled for {appt.start_time.strftime('%d %b %Y')} was missed.",
            notification_type=Notification.Type.APPOINTMENT_CANCELLED,
            icon="calendar-x",
            data={"appointment_id": appt.id, "link": "/appointments"},
            send_email=True,
            email_subject="Missed Appointment Notice",
            email_headline="You Missed Your Scheduled Consultation",
            email_meta={"Doctor": f"Dr. {appt.doctor.user.full_name}", "Date": appt.start_time.strftime("%d %b %Y")},
            action_text="Reschedule Appointment",
            action_url="http://localhost:5173/doctors",
        )
        count += 1

    logger.info(f"Missed appointments cleanup completed. Marked {count} appointments.")
    return f"Marked {count} missed appointments."


@shared_task
def nightly_platform_stats():
    """
    Placeholder task: Runs nightly to calculate platform metrics and logs run.
    """
    today = timezone.now().date()
    notifs_count = Notification.objects.filter(created_at__date=today).count()
    appts_count = Appointment.objects.filter(created_at__date=today).count()
    logger.info(f"Nightly platform stats for {today}: {appts_count} appointments created, {notifs_count} notifications sent.")
    return {"date": str(today), "appointments": appts_count, "notifications": notifs_count}
