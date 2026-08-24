"""
Admin API views for platform analytics, management consoles, status overrides, and audit logs.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile, Specialty
from .models import AuditLog, DailyStats, log_audit
from .serializers import (
    AdminAppointmentTableSerializer,
    AdminDoctorTableSerializer,
    AdminPatientTableSerializer,
    AppointmentsByStatusItemSerializer,
    AuditLogSerializer,
    OverviewStatsSerializer,
    RevenueTrendItemSerializer,
    SpecialtyDemandSerializer,
    TopDoctorStatsSerializer,
)


class StandardAdminPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class IsAdminUser(permissions.BasePermission):
    """
    Permission check strictly enforcing ADMIN role. Non-admins receive 403 Forbidden.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


def _get_range_days(range_param: str) -> int:
    if range_param == "7d":
        return 7
    elif range_param == "90d":
        return 90
    return 30


# ─── 1. OVERVIEW & ANALYTICS VIEWS ───

class AdminOverviewStatsView(APIView):
    """
    GET /api/v1/admin/stats/overview/?range=7d|30d|90d
    High-level platform KPI metrics with % changes vs previous period.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: OverviewStatsSerializer})
    def get(self, request):
        range_str = request.query_params.get("range", "30d").lower()
        days = _get_range_days(range_str)

        now = timezone.now()
        cur_start = now - timedelta(days=days)
        prev_start = now - timedelta(days=days * 2)

        # 1. Current Period Metrics
        cur_appts = Appointment.objects.filter(start_time__gte=cur_start)
        cur_total_appts = cur_appts.count()
        cur_completed_appts = cur_appts.filter(status=Appointment.Status.COMPLETED)
        cur_completed_count = cur_completed_appts.count()
        cur_revenue = (
            cur_completed_appts.aggregate(total=Sum("fee_at_booking"))["total"]
            or Decimal("0.00")
        )
        cur_cancelled_count = cur_appts.filter(
            status__in=[
                Appointment.Status.CANCELLED_BY_PATIENT,
                Appointment.Status.CANCELLED_BY_DOCTOR,
            ]
        ).count()
        cur_missed_count = cur_appts.filter(status=Appointment.Status.MISSED).count()

        # 2. Previous Period Metrics
        prev_appts = Appointment.objects.filter(
            start_time__gte=prev_start, start_time__lt=cur_start
        )
        prev_total_appts = prev_appts.count()
        prev_completed_appts = prev_appts.filter(status=Appointment.Status.COMPLETED)
        prev_revenue = (
            prev_completed_appts.aggregate(total=Sum("fee_at_booking"))["total"]
            or Decimal("0.00")
        )

        # 3. User stats
        active_doctors = DoctorProfile.objects.filter(user__is_active=True).count()
        prev_doctors = DoctorProfile.objects.filter(created_at__lt=cur_start).count()
        
        active_patients = User.objects.filter(
            role=User.Role.PATIENT, is_active=True
        ).count()
        prev_patients = User.objects.filter(
            role=User.Role.PATIENT, created_at__lt=cur_start
        ).count()

        new_users_this_period = User.objects.filter(created_at__gte=cur_start).count()

        # Helper for % delta
        def calc_delta(curr, prev):
            curr_val = float(curr)
            prev_val = float(prev)
            if prev_val == 0:
                return 100.0 if curr_val > 0 else 0.0
            return round(((curr_val - prev_val) / prev_val) * 100, 1)

        revenue_delta = calc_delta(cur_revenue, prev_revenue)
        appts_delta = calc_delta(cur_total_appts, prev_total_appts)
        doctors_delta = calc_delta(active_doctors, prev_doctors)
        patients_delta = calc_delta(active_patients, prev_patients)

        payload = {
            "range": range_str,
            "total_revenue": cur_revenue,
            "revenue_growth_pct": revenue_delta,
            "total_appointments": cur_total_appts,
            "appointments_growth_pct": appts_delta,
            "completed_count": cur_completed_count,
            "cancelled_count": cur_cancelled_count,
            "missed_count": cur_missed_count,
            "active_doctors": active_doctors,
            "doctors_growth_pct": doctors_delta,
            "active_patients": active_patients,
            "patients_growth_pct": patients_delta,
            "new_users_this_period": new_users_this_period,
        }

        serializer = OverviewStatsSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminRevenueTrendView(APIView):
    """
    GET /api/v1/admin/stats/revenue-trend/?range=7d|30d|90d
    Daily time-series data for Area and Line charts.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: RevenueTrendItemSerializer(many=True)})
    def get(self, request):
        range_str = request.query_params.get("range", "30d").lower()
        days = _get_range_days(range_str)
        today = timezone.now().date()
        start_date = today - timedelta(days=days - 1)

        # 1. Fetch precomputed snapshots from DailyStats
        stats_map = {
            s.date: s
            for s in DailyStats.objects.filter(date__gte=start_date, date__lte=today)
        }

        # 2. Query live database for appointments in this window for complete accuracy
        live_appts = (
            Appointment.objects.filter(
                start_time__date__gte=start_date, start_time__date__lte=today
            )
            .values("start_time__date")
            .annotate(
                bookings=Count("id"),
                completed=Count("id", filter=Q(status=Appointment.Status.COMPLETED)),
                revenue=Sum(
                    "fee_at_booking",
                    filter=Q(status=Appointment.Status.COMPLETED),
                ),
            )
        )
        live_map = {item["start_time__date"]: item for item in live_appts}

        # Build contiguous date series
        series = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            live_item = live_map.get(current_date)
            stat_item = stats_map.get(current_date)

            revenue = Decimal("0.00")
            bookings = 0
            completed = 0

            if live_item:
                revenue = live_item["revenue"] or Decimal("0.00")
                bookings = live_item["bookings"] or 0
                completed = live_item["completed"] or 0
            elif stat_item:
                revenue = stat_item.revenue
                bookings = stat_item.bookings_count
                completed = stat_item.completed_count

            series.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "revenue": revenue,
                "bookings": bookings,
                "completed": completed,
            })

        serializer = RevenueTrendItemSerializer(series, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminAppointmentsByStatusView(APIView):
    """
    GET /api/v1/admin/stats/appointments-by-status/
    Appointment status distribution for Donut charts.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: AppointmentsByStatusItemSerializer(many=True)})
    def get(self, request):
        status_counts = dict(
            Appointment.objects.values_list("status").annotate(count=Count("id"))
        )
        total = sum(status_counts.values()) or 1

        color_map = {
            Appointment.Status.CONFIRMED: ("Confirmed", "#0D9488"),
            Appointment.Status.COMPLETED: ("Completed", "#10B981"),
            Appointment.Status.PENDING: ("Pending", "#F59E0B"),
            Appointment.Status.CANCELLED_BY_PATIENT: ("Patient Cancelled", "#F43F5E"),
            Appointment.Status.CANCELLED_BY_DOCTOR: ("Doctor Cancelled", "#E11D48"),
            Appointment.Status.MISSED: ("Missed", "#64748B"),
        }

        results = []
        for st, (label, color) in color_map.items():
            count = status_counts.get(st, 0)
            pct = round((count / total) * 100, 1)
            results.append({
                "status": st,
                "label": label,
                "count": count,
                "percentage": pct,
                "color": color,
            })

        serializer = AppointmentsByStatusItemSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminTopDoctorsView(APIView):
    """
    GET /api/v1/admin/stats/top-doctors/?range=30d
    Top 10 performing doctors ranked by revenue & completion rate.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: TopDoctorStatsSerializer(many=True)})
    def get(self, request):
        range_str = request.query_params.get("range", "30d").lower()
        days = _get_range_days(range_str)
        since = timezone.now() - timedelta(days=days)

        doctors = (
            DoctorProfile.objects.select_related("user", "specialty")
            .filter(user__is_active=True)
            .annotate(
                period_revenue=Sum(
                    "appointments__fee_at_booking",
                    filter=Q(
                        appointments__status=Appointment.Status.COMPLETED,
                        appointments__start_time__gte=since,
                    ),
                ),
                period_completed=Count(
                    "appointments",
                    filter=Q(
                        appointments__status=Appointment.Status.COMPLETED,
                        appointments__start_time__gte=since,
                    ),
                ),
                period_total=Count(
                    "appointments",
                    filter=Q(appointments__start_time__gte=since),
                ),
            )
            .order_by("-period_revenue", "-period_completed")[:10]
        )

        results = []
        for doc in doctors:
            rev = doc.period_revenue or Decimal("0.00")
            completed = doc.period_completed or 0
            total = doc.period_total or 0
            rate = round((completed / total) * 100, 1) if total > 0 else 0.0

            results.append({
                "id": doc.id,
                "name": doc.user.full_name,
                "photo": doc.user.profile_picture.url if doc.user.profile_picture else None,
                "specialty": doc.specialty.name if doc.specialty else "General",
                "city": doc.city or "New Delhi",
                "revenue": rev,
                "completed_count": completed,
                "total_count": total,
                "completion_rate": rate,
                "avg_rating": doc.avg_rating or Decimal("5.0"),
            })

        serializer = TopDoctorStatsSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminSpecialtyDemandView(APIView):
    """
    GET /api/v1/admin/stats/specialty-demand/
    Demand and revenue breakdown per medical specialty for bar charts.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: SpecialtyDemandSerializer(many=True)})
    def get(self, request):
        specialties = Specialty.objects.annotate(
            bookings_count=Count("doctors__appointments"),
            revenue=Sum(
                "doctors__appointments__fee_at_booking",
                filter=Q(doctors__appointments__status=Appointment.Status.COMPLETED),
            ),
            doctor_count=Count("doctors", filter=Q(doctors__user__is_active=True), distinct=True),
        ).order_by("-bookings_count")

        results = []
        for s in specialties:
            results.append({
                "id": s.id,
                "name": s.name,
                "bookings_count": s.bookings_count or 0,
                "revenue": s.revenue or Decimal("0.00"),
                "doctor_count": s.doctor_count or 0,
            })

        serializer = SpecialtyDemandSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── 2. DOCTOR & PATIENT MANAGEMENT VIEWS ───

class AdminDoctorsListView(APIView):
    """
    GET /api/v1/admin/doctors/
    Searchable, filterable, sortable table of all doctor profiles.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: AdminDoctorTableSerializer(many=True)})
    def get(self, request):
        queryset = DoctorProfile.objects.select_related("user", "specialty").annotate(
            appointments_count=Count("appointments")
        )

        # Filters
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search)
                | Q(user__phone__icontains=search)
                | Q(user__email__icontains=search)
                | Q(city__icontains=search)
            )

        specialty_id = request.query_params.get("specialty")
        if specialty_id:
            queryset = queryset.filter(specialty_id=specialty_id)

        city = request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__iexact=city)

        is_available = request.query_params.get("is_available")
        if is_available in ("true", "false", "1", "0"):
            queryset = queryset.filter(is_available=is_available in ("true", "1"))

        is_active = request.query_params.get("is_active")
        if is_active in ("true", "false", "1", "0"):
            queryset = queryset.filter(user__is_active=is_active in ("true", "1"))

        # Sorting
        ordering = request.query_params.get("ordering", "-joined")
        order_map = {
            "name": "user__full_name",
            "-name": "-user__full_name",
            "fee": "consultation_fee",
            "-fee": "-consultation_fee",
            "avg_rating": "avg_rating",
            "-avg_rating": "-avg_rating",
            "appointments_count": "appointments_count",
            "-appointments_count": "-appointments_count",
            "joined": "user__date_joined",
            "-joined": "-user__date_joined",
        }
        queryset = queryset.order_by(order_map.get(ordering, "-user__date_joined"))

        paginator = StandardAdminPagination()
        page = paginator.paginate_queryset(queryset, request)

        results = []
        for d in page:
            results.append({
                "id": d.id,
                "user_id": d.user.id,
                "name": d.user.full_name,
                "phone": d.user.phone,
                "email": d.user.email,
                "specialty": d.specialty.name if d.specialty else "General",
                "qualification": d.qualification or "MBBS",
                "city": d.city or "New Delhi",
                "fee": d.consultation_fee,
                "avg_rating": d.avg_rating or Decimal("5.0"),
                "rating_count": d.rating_count or 0,
                "is_available": d.is_available,
                "is_active": d.user.is_active,
                "appointments_count": d.appointments_count,
                "joined": d.user.date_joined.strftime("%d %b %Y"),
            })

        return paginator.get_paginated_response(results)


class AdminDoctorDetailView(APIView):
    """
    PATCH /api/v1/admin/doctors/{id}/ — Toggle availability or active status
    DELETE /api/v1/admin/doctors/{id}/ — Soft-deactivate doctor
    """

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        doctor = get_object_or_404(DoctorProfile.objects.select_related("user"), pk=pk)
        data = request.data
        changes = {}

        if "is_available" in data:
            old_val = doctor.is_available
            new_val = bool(data["is_available"])
            doctor.is_available = new_val
            doctor.save(update_fields=["is_available"])
            changes["is_available"] = {"before": old_val, "after": new_val}

            log_audit(
                actor=request.user,
                action=AuditLog.Action.DOCTOR_AVAILABILITY_TOGGLE,
                target_model="DoctorProfile",
                target_id=doctor.id,
                description=f"Admin toggled availability of Dr. {doctor.user.full_name} to {new_val}.",
                changes=changes,
            )

        if "is_active" in data:
            old_val = doctor.user.is_active
            new_val = bool(data["is_active"])
            doctor.user.is_active = new_val
            doctor.user.save(update_fields=["is_active"])
            changes["is_active"] = {"before": old_val, "after": new_val}

            log_audit(
                actor=request.user,
                action=AuditLog.Action.DOCTOR_STATUS_UPDATE,
                target_model="DoctorProfile",
                target_id=doctor.id,
                description=f"Admin set active status of Dr. {doctor.user.full_name} to {new_val}.",
                changes=changes,
            )

        return Response({"success": True, "changes": changes}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        doctor = get_object_or_404(DoctorProfile.objects.select_related("user"), pk=pk)
        doctor.user.is_active = False
        doctor.user.save(update_fields=["is_active"])

        log_audit(
            actor=request.user,
            action=AuditLog.Action.DOCTOR_DEACTIVATED,
            target_model="DoctorProfile",
            target_id=doctor.id,
            description=f"Admin soft-deactivated Dr. {doctor.user.full_name}.",
            changes={"is_active": {"before": True, "after": False}},
        )

        return Response({"success": True, "detail": "Doctor soft-deactivated."}, status=status.HTTP_200_OK)


class AdminPatientsListView(APIView):
    """
    GET /api/v1/admin/patients/
    All patients with appointments count, total spent, and join date.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: AdminPatientTableSerializer(many=True)})
    def get(self, request):
        queryset = (
            User.objects.filter(role=User.Role.PATIENT)
            .annotate(
                appointments_count=Count("patient_appointments"),
                total_spent=Sum(
                    "patient_appointments__fee_at_booking",
                    filter=Q(patient_appointments__status=Appointment.Status.COMPLETED),
                ),
            )
            .order_by("-date_joined")
        )

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )

        paginator = StandardAdminPagination()
        page = paginator.paginate_queryset(queryset, request)

        results = []
        for p in page:
            last_appt = (
                Appointment.objects.filter(patient=p)
                .order_by("-start_time")
                .first()
            )
            last_date = (
                last_appt.start_time.strftime("%d %b %Y") if last_appt else None
            )

            results.append({
                "id": p.id,
                "name": p.full_name,
                "phone": p.phone,
                "email": p.email,
                "appointments_count": p.appointments_count or 0,
                "total_spent": p.total_spent or Decimal("0.00"),
                "is_active": p.is_active,
                "joined": p.date_joined.strftime("%d %b %Y"),
                "last_appointment_date": last_date,
            })

        return paginator.get_paginated_response(results)


class AdminPatientAppointmentsView(APIView):
    """
    GET /api/v1/admin/patients/{id}/appointments/
    Detailed appointment history for a specific patient.
    """

    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        patient = get_object_or_404(User, pk=pk)
        appts = (
            Appointment.objects.filter(patient=patient)
            .select_related("doctor", "doctor__user", "doctor__specialty")
            .order_by("-start_time")
        )

        results = []
        for a in appts:
            results.append({
                "id": a.id,
                "booking_code": a.booking_code,
                "doctor_name": f"Dr. {a.doctor.user.full_name}",
                "specialty": a.doctor.specialty.name if a.doctor.specialty else "General",
                "status": a.status,
                "fee": a.fee_at_booking,
                "date": a.start_time.strftime("%d %b %Y, %I:%M %p"),
                "symptoms": a.symptoms,
            })

        return Response(results, status=status.HTTP_200_OK)


# ─── 3. APPOINTMENTS & STATUS OVERRIDE VIEWS ───

class AdminAppointmentsListView(APIView):
    """
    GET /api/v1/admin/appointments/
    All appointments list with filters and status overriding capabilities.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: AdminAppointmentTableSerializer(many=True)})
    def get(self, request):
        queryset = Appointment.objects.select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient"
        ).order_by("-start_time")

        status_param = request.query_params.get("status")
        if status_param and status_param != "ALL":
            queryset = queryset.filter(status=status_param)

        start_date = request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)

        end_date = request.query_params.get("end_date")
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(booking_code__icontains=search)
                | Q(doctor__user__full_name__icontains=search)
                | Q(patient__full_name__icontains=search)
                | Q(patient__phone__icontains=search)
            )

        paginator = StandardAdminPagination()
        page = paginator.paginate_queryset(queryset, request)

        results = []
        for a in page:
            results.append({
                "id": a.id,
                "booking_code": a.booking_code,
                "doctor": {
                    "id": a.doctor.id,
                    "name": f"Dr. {a.doctor.user.full_name}",
                    "specialty": a.doctor.specialty.name if a.doctor.specialty else "General",
                },
                "patient": {
                    "id": a.patient.id,
                    "name": a.patient.full_name,
                    "phone": a.patient.phone,
                    "email": a.patient.email,
                },
                "status": a.status,
                "fee": a.fee_at_booking,
                "start_time": a.start_time,
                "end_time": a.end_time,
                "symptoms": a.symptoms,
                "created_at": a.created_at,
            })

        return paginator.get_paginated_response(results)


class AdminAppointmentStatusOverrideView(APIView):
    """
    PATCH /api/v1/admin/appointments/{id}/
    Admin overrides appointment status (with required audit note).
    """

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor__user", "patient"), pk=pk
        )
        new_status = request.data.get("status")
        audit_note = request.data.get("audit_note", "").strip()

        if not new_status or new_status not in [c[0] for c in Appointment.Status.choices]:
            return Response(
                {"detail": f"Invalid status '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not audit_note:
            return Response(
                {"detail": "Audit note is required for admin status overrides."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = appointment.status
        appointment.status = new_status
        appointment.save(update_fields=["status", "updated_at"])

        log_audit(
            actor=request.user,
            action=AuditLog.Action.APPOINTMENT_STATUS_OVERRIDE,
            target_model="Appointment",
            target_id=appointment.id,
            description=f"Admin overrode status of {appointment.booking_code} from {old_status} to {new_status}. Note: {audit_note}",
            changes={
                "status": {"before": old_status, "after": new_status},
                "note": audit_note,
            },
        )

        return Response(
            {
                "success": True,
                "booking_code": appointment.booking_code,
                "new_status": new_status,
            },
            status=status.HTTP_200_OK,
        )


# ─── 4. AUDIT LOGS VIEW ───

class AdminAuditLogsListView(APIView):
    """
    GET /api/v1/admin/audit-logs/?page=&action=&search=
    List immutable administrative audit logs.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: AuditLogSerializer(many=True)})
    def get(self, request):
        queryset = AuditLog.objects.select_related("actor").order_by("-created_at")

        action_param = request.query_params.get("action")
        if action_param:
            queryset = queryset.filter(action=action_param)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(target_id__icontains=search)
                | Q(actor__full_name__icontains=search)
            )

        paginator = StandardAdminPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
