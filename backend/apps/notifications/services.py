"""
NotificationService for SehatSetu: Real-time WebSocket dispatch, in-app storage, and transactional emails.
"""

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)


def send_html_email(
    subject: str,
    recipient_email: str,
    headline: str,
    body_text: str,
    action_text: str | None = None,
    action_url: str | None = None,
    meta_info: dict | None = None,
):
    """
    Sends a beautifully formatted clinical transactional email with deep teal palette
    and zero emojis, with clean plain text fallback.
    """
    if not recipient_email:
        return

    meta_html = ""
    meta_text = ""
    if meta_info:
        meta_html = "".join(
            f"<tr><td style='padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 500;'>{k}</td>"
            f"<td style='padding: 6px 12px; color: #0f172a; font-size: 13px; font-weight: 600;'>{v}</td></tr>"
            for k, v in meta_info.items()
        )
        meta_html = f"<table style='width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;'>{meta_html}</table>"
        meta_text = "\n" + "\n".join(f"{k}: {v}" for k, v in meta_info.items()) + "\n"

    button_html = ""
    button_text = ""
    if action_text and action_url:
        button_html = (
            f"<div style='margin-top: 24px;'>"
            f"<a href='{action_url}' style='background-color: #0f766e; color: #ffffff; padding: 10px 20px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;'>{action_text}</a>"
            f"</div>"
        )
        button_text = f"\n{action_text}: {action_url}\n"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #0f766e; padding: 20px 24px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">SEHATSETU</h1>
          <p style="color: #ccfbf1; margin: 4px 0 0 0; font-size: 12px;">Digital Telehealth Clinical Network</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px 28px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 17px; font-weight: 700;">{headline}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">{body_text}</p>

          {meta_html}
          {button_html}
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">This is an automated notification from the SehatSetu Telemedicine Portal.</p>
          <p style="margin: 4px 0 0 0; font-size: 11px;">Compliant with Government of India Telemedicine Guidelines 2020.</p>
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"SEHATSETU DIGITAL TELEHEALTH\n\n{headline}\n\n{body_text}\n{meta_text}{button_text}\n\nThis is an automated notification from SehatSetu Telemedicine."

    try:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "notifications@sehatsetu.com")
        msg = EmailMultiAlternatives(
            subject=f"[SehatSetu] {subject}",
            body=plain_text,
            from_email=from_email,
            to=[recipient_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Notification email sent to {recipient_email}: {subject}")
    except Exception as exc:
        logger.warning(f"Failed to send email to {recipient_email}: {exc}")


class NotificationService:
    """
    Centralized service for creating in-app notifications, pushing over WebSockets,
    and triggering automated emails.
    """

    @staticmethod
    def create_notification(
        recipient,
        title: str,
        message: str,
        notification_type: str = Notification.Type.SYSTEM,
        actor=None,
        icon: str | None = None,
        data: dict | None = None,
        send_email: bool = False,
        email_subject: str | None = None,
        email_headline: str | None = None,
        email_meta: dict | None = None,
        action_text: str | None = None,
        action_url: str | None = None,
    ) -> Notification:
        """
        Creates a notification row, broadcasts to the user's Channel group,
        and optionally sends an email.
        """
        if data is None:
            data = {}

        # Default icon mappings per type
        default_icons = {
            Notification.Type.APPOINTMENT_CONFIRMED: "calendar-check",
            Notification.Type.APPOINTMENT_CANCELLED: "calendar-x",
            Notification.Type.APPOINTMENT_REMINDER: "clock",
            Notification.Type.CONSULT_STARTED: "video",
            Notification.Type.NEW_PRESCRIPTION: "file-text",
            Notification.Type.REVIEW_RECEIVED: "star",
            Notification.Type.PROFILE_INCOMPLETE: "alert-circle",
            Notification.Type.SYSTEM: "bell",
        }

        icon_to_use = icon or default_icons.get(notification_type, "bell")

        notification = Notification.objects.create(
            recipient=recipient,
            actor=actor,
            type=notification_type,
            title=title,
            message=message,
            icon=icon_to_use,
            data=data,
            is_read=False,
        )

        # Real-time WebSocket push via Channels
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                unread_count = Notification.objects.filter(
                    recipient=recipient, is_read=False
                ).count()
                serialized = NotificationSerializer(notification).data

                async_to_sync(channel_layer.group_send)(
                    f"user_{recipient.id}",
                    {
                        "type": "notification_message",
                        "notification": serialized,
                        "unread_count": unread_count,
                    },
                )
        except Exception as exc:
            logger.warning(f"Channels push failed for user {recipient.id}: {exc}")

        # Send Email if requested
        if send_email and recipient.email:
            send_html_email(
                subject=email_subject or title,
                recipient_email=recipient.email,
                headline=email_headline or title,
                body_text=message,
                action_text=action_text,
                action_url=action_url or data.get("link"),
                meta_info=email_meta,
            )

        return notification

    # ─── Specialized Domain Notification Triggers ───

    @classmethod
    def notify_appointment_booked(cls, appointment):
        """Notifies both Patient and Doctor on booking creation."""
        doctor_user = appointment.doctor.user
        patient_user = appointment.patient
        date_str = appointment.start_time.strftime("%d %b %Y")
        time_str = appointment.start_time.strftime("%I:%M %p")

        # 1. Notify Doctor
        cls.create_notification(
            recipient=doctor_user,
            actor=patient_user,
            title="New Appointment Request",
            message=f"Patient {patient_user.full_name} has scheduled a consultation for {date_str} at {time_str}.",
            notification_type=Notification.Type.APPOINTMENT_CONFIRMED,
            icon="calendar-plus",
            data={
                "appointment_id": appointment.id,
                "booking_code": appointment.booking_code,
                "link": "/appointments",
            },
            send_email=True,
            email_subject=f"New Appointment Request - {appointment.booking_code}",
            email_headline="New Patient Appointment Scheduled",
            email_meta={
                "Patient": patient_user.full_name,
                "Date": date_str,
                "Time": time_str,
                "Booking Code": appointment.booking_code,
                "Type": "Telehealth Consultation",
            },
            action_text="View in Doctor Schedule",
            action_url=f"http://localhost:5173/appointments",
        )

        # 2. Notify Patient
        cls.create_notification(
            recipient=patient_user,
            actor=doctor_user,
            title="Appointment Request Received",
            message=f"Your consultation with Dr. {doctor_user.full_name} for {date_str} at {time_str} is booked.",
            notification_type=Notification.Type.APPOINTMENT_CONFIRMED,
            icon="calendar-check",
            data={
                "appointment_id": appointment.id,
                "booking_code": appointment.booking_code,
                "link": "/appointments",
            },
            send_email=True,
            email_subject=f"Appointment Confirmation - {appointment.booking_code}",
            email_headline="Consultation Confirmed",
            email_meta={
                "Doctor": f"Dr. {doctor_user.full_name}",
                "Date": date_str,
                "Time": time_str,
                "Booking Code": appointment.booking_code,
            },
            action_text="View My Appointments",
            action_url=f"http://localhost:5173/appointments",
        )

    @classmethod
    def notify_appointment_cancelled(cls, appointment, cancelled_by=None):
        """Notifies both parties when an appointment is cancelled."""
        doctor_user = appointment.doctor.user
        patient_user = appointment.patient
        date_str = appointment.start_time.strftime("%d %b %Y")
        time_str = appointment.start_time.strftime("%I:%M %p")

        # Notify Doctor
        cls.create_notification(
            recipient=doctor_user,
            actor=cancelled_by,
            title="Appointment Cancelled",
            message=f"The appointment for {patient_user.full_name} on {date_str} at {time_str} was cancelled.",
            notification_type=Notification.Type.APPOINTMENT_CANCELLED,
            icon="calendar-x",
            data={"appointment_id": appointment.id, "link": "/appointments"},
            send_email=True,
            email_subject=f"Appointment Cancelled - {appointment.booking_code}",
            email_headline="Appointment Cancellation Notice",
            email_meta={"Patient": patient_user.full_name, "Date": date_str, "Time": time_str},
        )

        # Notify Patient
        cls.create_notification(
            recipient=patient_user,
            actor=cancelled_by,
            title="Appointment Cancelled",
            message=f"Your appointment with Dr. {doctor_user.full_name} on {date_str} at {time_str} was cancelled.",
            notification_type=Notification.Type.APPOINTMENT_CANCELLED,
            icon="calendar-x",
            data={"appointment_id": appointment.id, "link": "/appointments"},
            send_email=True,
            email_subject=f"Appointment Cancelled - {appointment.booking_code}",
            email_headline="Appointment Cancellation Notice",
            email_meta={"Doctor": f"Dr. {doctor_user.full_name}", "Date": date_str, "Time": time_str},
        )

    @classmethod
    def notify_consult_started(cls, appointment):
        """Notifies Patient when Doctor starts the live video session."""
        doctor_user = appointment.doctor.user
        patient_user = appointment.patient

        cls.create_notification(
            recipient=patient_user,
            actor=doctor_user,
            title="Live Consultation Started",
            message=f"Dr. {doctor_user.full_name} has entered the consultation room. Join the live video call now.",
            notification_type=Notification.Type.CONSULT_STARTED,
            icon="video",
            data={
                "appointment_id": appointment.id,
                "link": f"/consult/{appointment.id}",
            },
            send_email=True,
            email_subject=f"Live Consultation Started - Dr. {doctor_user.full_name}",
            email_headline="Doctor Has Joined the Video Room",
            email_meta={
                "Doctor": f"Dr. {doctor_user.full_name}",
                "Booking Code": appointment.booking_code,
            },
            action_text="Join Consultation Now",
            action_url=f"http://localhost:5173/consult/{appointment.id}",
        )

    @classmethod
    def notify_prescription_created(cls, prescription):
        """Notifies Patient when a new e-Prescription has been generated."""
        patient_user = prescription.patient
        doctor_user = prescription.doctor.user

        cls.create_notification(
            recipient=patient_user,
            actor=doctor_user,
            title="e-Prescription Issued",
            message=f"Dr. {doctor_user.full_name} has issued your verified e-prescription ({prescription.verification_code}).",
            notification_type=Notification.Type.NEW_PRESCRIPTION,
            icon="file-text",
            data={
                "prescription_id": prescription.id,
                "verification_code": prescription.verification_code,
                "link": "/prescriptions",
            },
            send_email=True,
            email_subject=f"Your Digital Prescription is Ready - {prescription.verification_code}",
            email_headline="Verified e-Prescription Available for Download",
            email_meta={
                "Doctor": f"Dr. {doctor_user.full_name}",
                "Diagnosis": prescription.diagnosis,
                "Verification Code": prescription.verification_code,
            },
            action_text="View & Download Prescription",
            action_url=f"http://localhost:5173/prescriptions",
        )

    @classmethod
    def notify_review_received(cls, review):
        """Notifies Doctor when a patient submits a review."""
        doctor_user = review.doctor.user
        patient_user = review.patient

        cls.create_notification(
            recipient=doctor_user,
            actor=patient_user,
            title="New Patient Review",
            message=f"Patient {patient_user.full_name} left a {review.rating}-star review for your consultation.",
            notification_type=Notification.Type.REVIEW_RECEIVED,
            icon="star",
            data={"review_id": review.id, "rating": review.rating, "link": "/profile"},
            send_email=False,
        )
