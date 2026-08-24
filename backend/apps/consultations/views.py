"""
Views for Telehealth Video Rooms, Jitsi Configuration, Real-Time Chat, and Session Lifecycles.
"""

from datetime import timedelta
import uuid
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.accounts.models import User
from apps.appointments.models import Appointment
from .models import ConsultMessage, ConsultSession, Consultation
from .serializers import (
    ConsultMessageSerializer,
    ConsultSessionSerializer,
    ConsultStatusResponseSerializer,
    ConsultationSerializer,
    StartConsultResponseSerializer,
)


def _check_appointment_membership(user, appointment) -> tuple[bool, bool, bool]:
    """
    Returns (is_member, is_doctor, is_patient)
    """
    is_patient = user.id == appointment.patient_id
    is_doctor = (
        user.role == User.Role.DOCTOR
        and hasattr(user, "doctor_profile")
        and appointment.doctor_id == user.doctor_profile.id
    )
    is_admin = user.role == User.Role.ADMIN
    is_member = is_patient or is_doctor or is_admin
    return is_member, is_doctor, is_patient


class StartConsultView(APIView):
    """
    POST /api/v1/appointments/{id}/consult/start/
    Initiate or join an active telehealth session for a confirmed appointment.
    Checks:
    - Caller must be doctor or booked patient of the appointment.
    - Appointment status must be CONFIRMED or PENDING.
    - Time window must be within [start_time - 15min, end_time + 30min].
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: StartConsultResponseSerializer})
    def post(self, request, pk):
        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor", "doctor__user", "patient"),
            pk=pk,
        )

        is_member, is_doctor, is_patient = _check_appointment_membership(
            request.user, appointment
        )

        if not is_member:
            return Response(
                {"detail": "You do not have permission to join this consultation room."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status in [
            Appointment.Status.CANCELLED_BY_PATIENT,
            Appointment.Status.CANCELLED_BY_DOCTOR,
            Appointment.Status.MISSED,
        ]:
            return Response(
                {"detail": f"Cannot join consultation for an appointment that is {appointment.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        window_start = appointment.start_time - timedelta(minutes=15)
        window_end = appointment.end_time + timedelta(minutes=30)

        # Start window check (enforced in production, relaxed in dev/demo so live testing works)
        from django.conf import settings
        if not settings.DEBUG and request.user.role != User.Role.ADMIN:
            if now < window_start or now > window_end:
                return Response(
                    {
                        "detail": "Consultation room opens 15 minutes before scheduled start time and closes 30 minutes after end time.",
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                        "current_time": now.isoformat(),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Create or retrieve ConsultSession with deterministic room name
        default_room_name = f"appt-{appointment.id}-{appointment.booking_code.lower()}"
        session, created = ConsultSession.objects.get_or_create(
            appointment=appointment,
            defaults={
                "room_name": default_room_name,
                "status": ConsultSession.Status.ACTIVE,
                "started_at": now,
            },
        )

        if not created:
            session.status = ConsultSession.Status.ACTIVE
            if not session.started_at or session.ended_at:
                session.started_at = now
            session.ended_at = None
            session.save(update_fields=["status", "started_at", "ended_at"])

        # Ensure appointment is in active status
        if appointment.status != Appointment.Status.CONFIRMED:
            appointment.status = Appointment.Status.CONFIRMED
            appointment.save(update_fields=["status", "updated_at"])

        # Broadcast status update to WebSocket channel layer
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"consult_{appointment.id}",
                    {
                        "type": "session_event",
                        "status": session.status,
                    },
                )
            except Exception:
                pass

        # If doctor started the consult, notify patient
        if is_doctor:
            try:
                from apps.notifications.services import NotificationService
                NotificationService.notify_consult_started(appointment)
            except Exception:
                pass

        jitsi_room_name = f"SehatSetu-{session.room_name}"
        display_name = request.user.full_name
        if is_doctor and not display_name.lower().startswith("dr."):
            display_name = f"Dr. {display_name}"

        payload = {
            "session_id": session.id,
            "room_name": session.room_name,
            "status": session.status,
            "started_at": session.started_at,
            "jitsi_config": {
                "domain": "meet.jit.si",
                "room_name": jitsi_room_name,
                "display_name": display_name,
                "email": request.user.email or "",
                "is_doctor": is_doctor,
                "prejoin_page_enabled": False,
                "start_with_audio_muted": False,
                "start_with_video_muted": False,
            },
        }

        return Response(payload, status=status.HTTP_200_OK)


class EndConsultView(APIView):
    """
    POST /api/v1/appointments/{id}/consult/end/
    End consultation session, mark appointment COMPLETED, and record end timestamp.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)

        is_member, is_doctor, is_patient = _check_appointment_membership(
            request.user, appointment
        )

        if not is_member:
            return Response(
                {"detail": "You do not have permission to end this consultation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()

        # Update ConsultSession
        session = getattr(appointment, "consult_session", None)
        if not session:
            session = ConsultSession.objects.create(
                appointment=appointment,
                room_name=uuid.uuid4().hex[:16],
                status=ConsultSession.Status.ENDED,
                started_at=now,
                ended_at=now,
            )
        else:
            session.status = ConsultSession.Status.ENDED
            session.ended_at = now
            session.save(update_fields=["status", "ended_at"])

        # Mark appointment as COMPLETED
        if appointment.status != Appointment.Status.COMPLETED:
            appointment.status = Appointment.Status.COMPLETED
            appointment.save(update_fields=["status", "updated_at"])

        # Broadcast ended status to WebSocket group
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"consult_{appointment.id}",
                    {
                        "type": "session_event",
                        "status": ConsultSession.Status.ENDED,
                    },
                )
            except Exception:
                pass

        return Response(
            {
                "status": ConsultSession.Status.ENDED,
                "ended_at": session.ended_at,
                "appointment_status": appointment.status,
            },
            status=status.HTTP_200_OK,
        )


class ConsultStatusView(APIView):
    """
    GET /api/v1/appointments/{id}/consult/status/
    Lightweight status and time window checker for consultation rooms.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: ConsultStatusResponseSerializer})
    def get(self, request, pk):
        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor", "patient"),
            pk=pk,
        )

        is_member, is_doctor, is_patient = _check_appointment_membership(
            request.user, appointment
        )

        if not is_member:
            return Response(
                {"detail": "You do not have permission to view this consultation status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        session = getattr(appointment, "consult_session", None)
        now = timezone.now()
        window_start = appointment.start_time - timedelta(minutes=15)
        from django.conf import settings
        start_window_valid = (
            True
            if settings.DEBUG
            else ((window_start <= now <= window_end) or request.user.role == User.Role.ADMIN)
        )

        payload = {
            "session_id": session.id if session else None,
            "room_name": session.room_name if session else None,
            "status": session.status if session else ConsultSession.Status.WAITING,
            "started_at": session.started_at if session else None,
            "ended_at": session.ended_at if session else None,
            "appointment_status": appointment.status,
            "is_doctor": is_doctor,
            "start_window_valid": start_window_valid,
        }

        return Response(payload, status=status.HTTP_200_OK)


class ConsultMessagesListView(generics.ListAPIView):
    """
    GET /api/v1/appointments/{id}/messages/
    Fetch recent 50 messages exchanged during this consultation.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultMessageSerializer
    pagination_class = None

    def get_queryset(self):
        appointment_id = self.kwargs.get("pk")
        appointment = get_object_or_404(Appointment, pk=appointment_id)

        is_member, _, _ = _check_appointment_membership(
            self.request.user, appointment
        )
        if not is_member:
            return ConsultMessage.objects.none()

        return (
            ConsultMessage.objects.filter(appointment=appointment)
            .select_related("sender")
            .order_by("created_at")[:50]
        )


class ConsultationListCreateView(generics.ListCreateAPIView):
    """
    List or create legacy consultation sessions.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Consultation.objects.filter(appointment__doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return Consultation.objects.all()
        return Consultation.objects.filter(appointment__patient=user)


class ConsultationDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update legacy consultation status and notes.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return Consultation.objects.filter(appointment__doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return Consultation.objects.all()
        return Consultation.objects.filter(appointment__patient=user)
