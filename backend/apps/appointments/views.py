"""
Views for Appointment booking, Availability generation, and lifecycle management.
"""

from datetime import datetime, time, timedelta
from django.db import IntegrityError, OperationalError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.accounts.models import User
from apps.doctors.models import DoctorProfile
from .models import Appointment, AvailabilityRule
from .serializers import (
    AppointmentSerializer,
    AvailabilityRuleSerializer,
    BookAppointmentSerializer,
    CancelAppointmentSerializer,
    DayAvailabilitySerializer,
)


class AppointmentPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class DoctorAvailabilityView(APIView):
    """
    GET: Next 14-days availability slots for a doctor with precomputed booking status.
    POST: Bulk configure recurring weekly availability rules (Doctor/Admin only).
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @extend_schema(responses={200: DayAvailabilitySerializer(many=True)})
    def get(self, request, pk):
        doctor = get_object_or_404(DoctorProfile, pk=pk)

        # 1. Fetch active rules
        rules_by_weekday = {
            rule.weekday: rule
            for rule in doctor.availability_rules.filter(is_active=True)
        }

        # If no rules exist, default to Mon-Sat 09:00 - 17:00 30min slots
        if not rules_by_weekday:
            default_start = time(9, 0)
            default_end = time(17, 0)
            for w in range(1, 7):
                rule, _ = AvailabilityRule.objects.get_or_create(
                    doctor=doctor,
                    weekday=w,
                    defaults={
                        "start_time": default_start,
                        "end_time": default_end,
                        "slot_duration": 30,
                        "is_active": True,
                    },
                )
                rules_by_weekday[w] = rule

        now = timezone.now()
        today = timezone.localdate(now)
        days_count = 14

        window_start = timezone.make_aware(datetime.combine(today, time(0, 0)))
        window_end = timezone.make_aware(
            datetime.combine(today + timedelta(days=days_count), time(23, 59, 59))
        )

        # 2. Single-query precompute of all booked appointments in window
        booked_slot_times = set(
            Appointment.objects.filter(
                doctor=doctor,
                start_time__gte=window_start,
                start_time__lte=window_end,
                status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
            ).values_list("start_time", flat=True)
        )

        # Helper to check if slot time is booked
        def is_slot_booked(slot_dt):
            return any(
                abs((b - slot_dt).total_seconds()) < 60 for b in booked_slot_times
            )

        days_data = []

        for i in range(days_count):
            current_date = today + timedelta(days=i)
            weekday_iso = current_date.isoweekday()  # 1=Mon ... 7=Sun
            day_name = current_date.strftime("%A")

            day_slots = []
            rule = rules_by_weekday.get(weekday_iso)

            if rule and rule.is_active and doctor.is_available:
                duration_mins = rule.slot_duration
                start_dt = timezone.make_aware(
                    datetime.combine(current_date, rule.start_time)
                )
                end_dt = timezone.make_aware(
                    datetime.combine(current_date, rule.end_time)
                )

                cursor = start_dt
                while cursor + timedelta(minutes=duration_mins) <= end_dt:
                    slot_end = cursor + timedelta(minutes=duration_mins)
                    booked = is_slot_booked(cursor)
                    is_past = cursor <= now

                    day_slots.append(
                        {
                            "start_time": cursor,
                            "end_time": slot_end,
                            "booked": booked,
                            "is_past": is_past,
                        }
                    )
                    cursor = slot_end

            days_data.append(
                {
                    "date": current_date,
                    "day_of_week": weekday_iso,
                    "day_name": day_name,
                    "slots": day_slots,
                }
            )

        serializer = DayAvailabilitySerializer(days_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=AvailabilityRuleSerializer(many=True),
        responses={200: AvailabilityRuleSerializer(many=True)},
    )
    def post(self, request, pk):
        doctor = get_object_or_404(DoctorProfile, pk=pk)

        # Permission check: must be the doctor or admin
        if request.user.role != User.Role.ADMIN:
            if not hasattr(request.user, "doctor_profile") or request.user.doctor_profile.id != doctor.id:
                return Response(
                    {"detail": "You do not have permission to manage this doctor's schedule."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        rules_data = request.data if isinstance(request.data, list) else [request.data]
        saved_rules = []

        with transaction.atomic():
            for item in rules_data:
                serializer = AvailabilityRuleSerializer(data=item)
                serializer.is_valid(raise_exception=True)
                val = serializer.validated_data

                rule, _ = AvailabilityRule.objects.update_or_create(
                    doctor=doctor,
                    weekday=val["weekday"],
                    defaults={
                        "start_time": val["start_time"],
                        "end_time": val["end_time"],
                        "slot_duration": val.get("slot_duration", 30),
                        "is_active": val.get("is_active", True),
                    },
                )
                saved_rules.append(rule)

        return Response(
            AvailabilityRuleSerializer(saved_rules, many=True).data,
            status=status.HTTP_200_OK,
        )


class AppointmentListCreateView(APIView):
    """
    GET: Role-aware list of appointments (Patient, Doctor, or Admin).
    POST: Book an appointment with concurrency lock & validation.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("status", str, description="Filter by status (CONFIRMED, PENDING, COMPLETED, CANCELLED)"),
            OpenApiParameter("upcoming", str, description="Filter: true (upcoming) or false (past)"),
            OpenApiParameter("date", str, description="Filter by date YYYY-MM-DD"),
        ],
        responses={200: AppointmentSerializer(many=True)},
    )
    def get(self, request):
        user = request.user
        queryset = Appointment.objects.select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient"
        )

        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            queryset = queryset.filter(doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            pass
        else:
            queryset = queryset.filter(patient=user)

        # Filters
        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        date_param = request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(start_time__date=date_param)

        upcoming_param = request.query_params.get("upcoming")
        now = timezone.now()
        if upcoming_param == "true":
            queryset = queryset.filter(
                start_time__gte=now,
                status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
            ).order_by("start_time")
        elif upcoming_param == "false":
            queryset = queryset.filter(
                Q(start_time__lt=now)
                | Q(status__in=[
                    Appointment.Status.COMPLETED,
                    Appointment.Status.CANCELLED_BY_PATIENT,
                    Appointment.Status.CANCELLED_BY_DOCTOR,
                    Appointment.Status.MISSED,
                ])
            ).order_by("-start_time")
        else:
            queryset = queryset.order_by("-start_time")

        paginator = AppointmentPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AppointmentSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=BookAppointmentSerializer, responses={201: AppointmentSerializer})
    def post(self, request):
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor_id = serializer.validated_data["doctor_id"]
        start_time = serializer.validated_data["start_time"]
        symptoms = serializer.validated_data.get("symptoms", "")

        # 1. Past time check
        now = timezone.now()
        if start_time <= now:
            return Response(
                {"detail": "Cannot book an appointment in the past."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Check Doctor availability rule & slot duration
        doctor = get_object_or_404(DoctorProfile, pk=doctor_id)
        if not doctor.is_available:
            return Response(
                {"detail": "Doctor is currently not available for bookings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        local_start = timezone.localtime(start_time)
        weekday = local_start.isoweekday()
        rule = doctor.availability_rules.filter(weekday=weekday, is_active=True).first()

        # Slot duration calculation
        slot_duration_mins = rule.slot_duration if rule else 30
        rule_start = rule.start_time if rule else time(9, 0)
        rule_end = rule.end_time if rule else time(17, 0)

        slot_end = start_time + timedelta(minutes=slot_duration_mins)

        # Validate start_time is within working hours
        if not (local_start.time() >= rule_start and local_start.time() < rule_end):
            return Response(
                {"detail": f"Selected time is outside doctor's working hours ({rule_start.strftime('%H:%M')} - {rule_end.strftime('%H:%M')})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate start_time aligns on slot boundary
        start_total_mins = local_start.hour * 60 + local_start.minute
        rule_start_mins = rule_start.hour * 60 + rule_start.minute
        if (start_total_mins - rule_start_mins) % slot_duration_mins != 0:
            return Response(
                {"detail": f"Booking time must match an exact {slot_duration_mins}-minute slot boundary."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Check Patient overlapping appointment
        patient_overlap = Appointment.objects.filter(
            patient=request.user,
            start_time__lt=slot_end,
            end_time__gt=start_time,
            status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
        ).exists()

        if patient_overlap:
            return Response(
                {"detail": "You already have an overlapping appointment scheduled during this time window."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Concurrency-safe atomic transaction with select_for_update
        try:
            with transaction.atomic():
                # Lock the doctor profile row to serialize concurrent booking attempts
                doc_locked = DoctorProfile.objects.select_for_update().get(id=doctor_id)

                # Check if this exact slot was already booked
                already_booked = Appointment.objects.filter(
                    doctor=doc_locked,
                    start_time=start_time,
                    status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
                ).exists()

                if already_booked:
                    return Response(
                        {
                            "code": "SLOT_TAKEN",
                            "detail": "Slot was just taken, please pick another.",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                appointment = Appointment.objects.create(
                    doctor=doc_locked,
                    patient=request.user,
                    start_time=start_time,
                    end_time=slot_end,
                    status=Appointment.Status.CONFIRMED,
                    fee_at_booking=doc_locked.consultation_fee,
                    symptoms=symptoms,
                )
        except (IntegrityError, OperationalError):
            return Response(
                {
                    "code": "SLOT_TAKEN",
                    "detail": "Slot was just taken, please pick another.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            AppointmentSerializer(appointment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AppointmentDetailView(generics.RetrieveAPIView):
    """
    Retrieve single appointment details by ID.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient"
        )
        if user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile"):
            return queryset.filter(doctor=user.doctor_profile)
        elif user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(patient=user)


class CancelAppointmentView(APIView):
    """
    Cancel an appointment.
    - Patient can cancel > 6h before start_time.
    - Doctor can cancel anytime with reason.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CancelAppointmentSerializer, responses={200: AppointmentSerializer})
    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        user = request.user

        # Permission check
        is_patient = appointment.patient_id == user.id
        is_doctor = (
            user.role == User.Role.DOCTOR
            and hasattr(user, "doctor_profile")
            and appointment.doctor_id == user.doctor_profile.id
        )
        is_admin = user.role == User.Role.ADMIN

        if not (is_patient or is_doctor or is_admin):
            return Response(
                {"detail": "You do not have permission to cancel this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status in [
            Appointment.Status.COMPLETED,
            Appointment.Status.CANCELLED_BY_PATIENT,
            Appointment.Status.CANCELLED_BY_DOCTOR,
        ]:
            return Response(
                {"detail": f"Cannot cancel an appointment that is already {appointment.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        now = timezone.now()

        # Patient 6h notice rule
        if is_patient and not (is_doctor or is_admin):
            if appointment.start_time - now < timedelta(hours=6):
                return Response(
                    {
                        "detail": "Patients can only cancel up to 6 hours before the appointment. Please contact support or the clinic directly."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            appointment.status = Appointment.Status.CANCELLED_BY_PATIENT
        else:
            appointment.status = Appointment.Status.CANCELLED_BY_DOCTOR

        appointment.cancellation_reason = reason
        appointment.save(update_fields=["status", "cancellation_reason", "updated_at"])

        return Response(
            AppointmentSerializer(appointment, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ConfirmAppointmentView(APIView):
    """
    Confirm appointment (Doctor only).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        if (
            request.user.role != User.Role.ADMIN
            and (not hasattr(request.user, "doctor_profile") or appointment.doctor_id != request.user.doctor_profile.id)
        ):
            return Response(
                {"detail": "Doctor permission required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        appointment.status = Appointment.Status.CONFIRMED
        appointment.save(update_fields=["status", "updated_at"])
        return Response(
            AppointmentSerializer(appointment, context={"request": request}).data
        )


class CompleteAppointmentView(APIView):
    """
    Mark appointment as completed (Doctor only, after start time).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        if (
            request.user.role != User.Role.ADMIN
            and (not hasattr(request.user, "doctor_profile") or appointment.doctor_id != request.user.doctor_profile.id)
        ):
            return Response(
                {"detail": "Doctor permission required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        appointment.status = Appointment.Status.COMPLETED
        appointment.save(update_fields=["status", "updated_at"])
        return Response(
            AppointmentSerializer(appointment, context={"request": request}).data
        )
