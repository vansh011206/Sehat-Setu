"""
Views for Patient, Doctor, and Telehealth Telemetry Dashboards.
"""

from datetime import datetime, time, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.appointments.serializers import AppointmentSerializer
from apps.doctors.models import DoctorProfile
from apps.doctors.serializers import DoctorListSerializer
from apps.prescriptions.models import Prescription
from .serializers import (
    DoctorDashboardSerializer,
    DoctorPatientSummarySerializer,
    PatientDashboardSerializer,
)


class PatientDashboardView(APIView):
    """
    GET /api/v1/dashboard/patient/
    Telemetry, next appointment with live countdown, recent bookings,
    and city-recommended verified doctors for authenticated patient.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: PatientDashboardSerializer})
    def get(self, request):
        user = request.user
        now = timezone.now()

        # 1. Appointments QuerySet for Patient
        patient_appointments = Appointment.objects.filter(patient=user).select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient"
        )

        total_appointments = patient_appointments.count()

        # 2. Next Upcoming Appointment
        upcoming_appointment = (
            patient_appointments.filter(
                start_time__gte=now,
                status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
            )
            .order_by("start_time")
            .first()
        )

        # 3. Aggregated counts
        completed_count = patient_appointments.filter(
            status=Appointment.Status.COMPLETED
        ).count()
        cancelled_count = patient_appointments.filter(
            status__in=[
                Appointment.Status.CANCELLED_BY_PATIENT,
                Appointment.Status.CANCELLED_BY_DOCTOR,
            ]
        ).count()

        prescriptions_count = Prescription.objects.filter(patient=user).count()

        # 4. 5 Most Recent Appointments
        recent_appointments = patient_appointments.order_by("-start_time")[:5]

        # 5. Recommended Doctors: Top rated in patient's most-booked city
        city_pref_qs = (
            patient_appointments.exclude(doctor__city="")
            .values("doctor__city")
            .annotate(city_count=Count("id"))
            .order_by("-city_count")
            .first()
        )

        preferred_city = city_pref_qs["doctor__city"] if city_pref_qs else None

        active_doctors = (
            DoctorProfile.objects.filter(user__is_active=True, is_available=True)
            .select_related("user", "specialty")
            .order_by("-avg_rating", "-rating_count", "-years_of_experience")
        )

        recommended_doctors = []
        if preferred_city:
            city_docs = list(active_doctors.filter(city__iexact=preferred_city)[:6])
            recommended_doctors.extend(city_docs)
            if len(recommended_doctors) < 6:
                existing_ids = [d.id for d in recommended_doctors]
                other_docs = list(
                    active_doctors.exclude(id__in=existing_ids)[: 6 - len(recommended_doctors)]
                )
                recommended_doctors.extend(other_docs)
        else:
            recommended_doctors = list(active_doctors[:6])

        context = {"request": request}
        payload = {
            "stats": {
                "total_appointments": total_appointments,
                "upcoming_appointment": (
                    AppointmentSerializer(upcoming_appointment, context=context).data
                    if upcoming_appointment
                    else None
                ),
                "completed_count": completed_count,
                "cancelled_count": cancelled_count,
                "prescriptions_count": prescriptions_count,
            },
            "recent_appointments": AppointmentSerializer(
                recent_appointments, many=True, context=context
            ).data,
            "recommended_doctors": DoctorListSerializer(
                recommended_doctors, many=True, context=context
            ).data,
        }

        return Response(payload, status=status.HTTP_200_OK)


class DoctorDashboardView(APIView):
    """
    GET /api/v1/dashboard/doctor/
    Telemetry for doctor: today's schedule with patient mini-profiles,
    7-day count, completed count, revenue sum, 12-month chart data,
    and profile completion checklist.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: DoctorDashboardSerializer})
    def get(self, request):
        user = request.user

        # Must be a doctor with a profile or admin
        if user.role != User.Role.DOCTOR or not hasattr(user, "doctor_profile"):
            if user.role == User.Role.ADMIN:
                doctor_profile = DoctorProfile.objects.first()
                if not doctor_profile:
                    return Response(
                        {"detail": "No doctor profiles configured in system."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            else:
                return Response(
                    {"detail": "Doctor profile required to access doctor dashboard."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            doctor_profile = user.doctor_profile

        now = timezone.now()
        local_now = timezone.localtime(now)
        today = local_now.date()

        today_start = timezone.make_aware(datetime.combine(today, time(0, 0)))
        today_end = timezone.make_aware(datetime.combine(today, time(23, 59, 59)))

        # Parse timeframe/days parameter
        timeframe_param = request.query_params.get("timeframe", "").strip().lower()
        days_param = request.query_params.get("days", "").strip().lower()

        if days_param == "7" or timeframe_param == "7d":
            days_count = 7
            timeframe_key = "7d"
            timeframe_label = "Last 7 Days"
            range_start = timezone.make_aware(datetime.combine(today - timedelta(days=6), time(0, 0)))
            range_end = today_end
        elif days_param == "20" or timeframe_param == "20d":
            days_count = 20
            timeframe_key = "20d"
            timeframe_label = "Last 20 Days"
            range_start = timezone.make_aware(datetime.combine(today - timedelta(days=19), time(0, 0)))
            range_end = today_end
        elif days_param == "30" or timeframe_param == "30d":
            days_count = 30
            timeframe_key = "30d"
            timeframe_label = "Last 30 Days"
            range_start = timezone.make_aware(datetime.combine(today - timedelta(days=29), time(0, 0)))
            range_end = today_end
        elif timeframe_param == "all" or days_param == "all":
            days_count = 3650
            timeframe_key = "all"
            timeframe_label = "All Time"
            range_start = timezone.make_aware(datetime(2020, 1, 1, 0, 0))
            range_end = timezone.make_aware(datetime(2035, 12, 31, 23, 59))
        else:
            days_count = 1
            timeframe_key = "today"
            timeframe_label = "Today"
            range_start = today_start
            range_end = today_end

        # 1. Appointments with Patient Details for Selected Timeframe
        appointments_qs = (
            Appointment.objects.filter(
                doctor=doctor_profile,
                start_time__range=(range_start, range_end),
            )
            .select_related("patient")
            .order_by("-start_time" if days_count > 1 else "start_time")
        )

        schedule_list = []
        for appt in appointments_qs:
            schedule_list.append(
                {
                    "id": appt.id,
                    "booking_code": appt.booking_code,
                    "start_time": appt.start_time,
                    "end_time": appt.end_time,
                    "status": appt.status,
                    "fee_at_booking": appt.fee_at_booking,
                    "symptoms": appt.symptoms,
                    "patient": {
                        "id": appt.patient.id,
                        "phone": appt.patient.phone,
                        "email": appt.patient.email,
                        "full_name": appt.patient.full_name,
                        "role": appt.patient.role,
                        "profile_picture": (
                            request.build_absolute_uri(appt.patient.profile_picture.url)
                            if appt.patient.profile_picture
                            else None
                        ),
                        "gender": appt.patient.gender,
                        "date_of_birth": appt.patient.date_of_birth,
                    },
                }
            )

        # 2. Key Metrics for Selected Timeframe
        next_7_days_end = now + timedelta(days=7)
        upcoming_7_days_count = Appointment.objects.filter(
            doctor=doctor_profile,
            start_time__gte=now,
            start_time__lte=next_7_days_end,
            status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
        ).count()

        completed_count = appointments_qs.filter(
            status=Appointment.Status.COMPLETED
        ).count()

        period_patients = appointments_qs.values("patient_id").distinct().count()
        all_time_patients = (
            Appointment.objects.filter(
                doctor=doctor_profile,
                status=Appointment.Status.COMPLETED,
            )
            .values("patient_id")
            .distinct()
            .count()
        )
        total_patients_served = period_patients if days_count > 1 else all_time_patients

        period_revenue_agg = appointments_qs.filter(
            status=Appointment.Status.COMPLETED
        ).aggregate(total=Sum("fee_at_booking"))
        period_revenue = period_revenue_agg["total"] or Decimal("0.00")

        # 3. Trends & Analytics (Daily for 7/20/30 days, Monthly for Today/All)
        chart_data = []
        if days_count in [7, 20, 30]:
            # Generate daily metrics for each day in range
            for i in range(days_count - 1, -1, -1):
                d = today - timedelta(days=i)
                d_start = timezone.make_aware(datetime.combine(d, time(0, 0)))
                d_end = timezone.make_aware(datetime.combine(d, time(23, 59, 59)))
                day_appts = Appointment.objects.filter(
                    doctor=doctor_profile,
                    start_time__range=(d_start, d_end),
                )
                d_count = day_appts.count()
                d_completed = day_appts.filter(status=Appointment.Status.COMPLETED).count()
                d_rev_agg = day_appts.filter(status=Appointment.Status.COMPLETED).aggregate(
                    tot=Sum("fee_at_booking")
                )
                d_rev = d_rev_agg["tot"] or Decimal("0.00")
                chart_data.append(
                    {
                        "month": d.strftime("%d %b"),
                        "date_key": d.strftime("%Y-%m-%d"),
                        "count": d_count,
                        "completed": d_completed,
                        "revenue": d_rev,
                    }
                )
        else:
            # 12-Month Rolling Overview
            current_year = today.year
            current_month = today.month

            for i in range(11, -1, -1):
                target_month = current_month - i
                target_year = current_year
                while target_month <= 0:
                    target_month += 12
                    target_year -= 1

                m_start = timezone.make_aware(
                    datetime(target_year, target_month, 1, 0, 0, 0)
                )
                if target_month == 12:
                    m_end = timezone.make_aware(
                        datetime(target_year + 1, 1, 1, 0, 0, 0)
                    ) - timedelta(microseconds=1)
                else:
                    m_end = timezone.make_aware(
                        datetime(target_year, target_month + 1, 1, 0, 0, 0)
                    ) - timedelta(microseconds=1)

                month_appts = Appointment.objects.filter(
                    doctor=doctor_profile,
                    start_time__range=(m_start, m_end),
                )

                m_count = month_appts.count()
                m_completed = month_appts.filter(status=Appointment.Status.COMPLETED).count()
                m_revenue_agg = month_appts.filter(
                    status=Appointment.Status.COMPLETED
                ).aggregate(tot=Sum("fee_at_booking"))
                m_revenue = m_revenue_agg["tot"] or Decimal("0.00")

                chart_data.append(
                    {
                        "month": m_start.strftime("%b %y"),
                        "date_key": m_start.strftime("%Y-%m"),
                        "count": m_count,
                        "completed": m_completed,
                        "revenue": m_revenue,
                    }
                )

        # 4. Profile Completion Checklist
        has_availability = AvailabilityRule.objects.filter(
            doctor=doctor_profile, is_active=True
        ).exists()

        checklist_items = {
            "qualification": bool(doctor_profile.qualification),
            "registration_number": bool(doctor_profile.registration_number),
            "specialty": bool(doctor_profile.specialty_id),
            "city": bool(doctor_profile.city),
            "consultation_fee": bool(
                doctor_profile.consultation_fee and doctor_profile.consultation_fee > 0
            ),
            "bio": bool(doctor_profile.bio),
            "clinic_name": bool(doctor_profile.clinic_name),
            "availability_configured": has_availability,
        }

        total_items = len(checklist_items)
        completed_items = sum(1 for v in checklist_items.values() if v)
        completion_percentage = int((completed_items / total_items) * 100)
        is_profile_complete = (
            doctor_profile.is_profile_complete and has_availability
        )

        payload = {
            "timeframe": timeframe_key,
            "timeframe_label": timeframe_label,
            "today_schedule": schedule_list,
            "schedule": schedule_list,
            "upcoming_7_days_count": upcoming_7_days_count,
            "completed_today_count": completed_count,
            "total_patients_served": total_patients_served,
            "avg_rating": doctor_profile.avg_rating,
            "rating_count": doctor_profile.rating_count,
            "today_revenue": period_revenue,
            "monthly_appointments": chart_data,
            "is_profile_complete": is_profile_complete,
            "profile_completion_checklist": {
                "items": checklist_items,
                "percentage": completion_percentage,
            },
        }

        return Response(payload, status=status.HTTP_200_OK)


class DoctorPatientsListView(APIView):
    """
    GET /api/v1/doctors/{id}/patients/
    List of distinct patients who have consulted or scheduled with this doctor,
    including visit history count, last visit date, past appointments, and prescriptions.
    Doctor only (permission check).
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: DoctorPatientSummarySerializer(many=True)})
    def get(self, request, pk):
        doctor = get_object_or_404(DoctorProfile, pk=pk)

        # Permission check: must be the doctor or admin
        if request.user.role != User.Role.ADMIN:
            if (
                not hasattr(request.user, "doctor_profile")
                or request.user.doctor_profile.id != doctor.id
            ):
                return Response(
                    {"detail": "You do not have permission to view this doctor's patients."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Find distinct patient IDs for this doctor
        patient_ids = (
            Appointment.objects.filter(doctor=doctor)
            .values_list("patient_id", flat=True)
            .distinct()
        )

        patients = User.objects.filter(id__in=patient_ids).order_by("full_name")

        results = []
        for p in patients:
            p_appts = Appointment.objects.filter(doctor=doctor, patient=p).order_by("-start_time")
            total_visits = p_appts.count()
            last_appt = p_appts.first()
            last_visit_date = last_appt.start_time if last_appt else None
            last_status = last_appt.status if last_appt else None

            past_appointments_data = [
                {
                    "id": a.id,
                    "booking_code": a.booking_code,
                    "start_time": a.start_time,
                    "end_time": a.end_time,
                    "status": a.status,
                    "fee_at_booking": a.fee_at_booking,
                    "symptoms": a.symptoms,
                }
                for a in p_appts[:10]
            ]

            p_rx = Prescription.objects.filter(doctor=doctor, patient=p).order_by("-created_at")
            prescriptions_data = [
                {
                    "id": rx.id,
                    "diagnosis": rx.diagnosis,
                    "medicines": rx.medicines,
                    "notes": rx.notes,
                    "created_at": rx.created_at,
                }
                for rx in p_rx[:10]
            ]

            results.append(
                {
                    "id": p.id,
                    "full_name": p.full_name,
                    "phone": p.phone,
                    "email": p.email,
                    "gender": p.gender,
                    "date_of_birth": p.date_of_birth,
                    "profile_picture": p.profile_picture,
                    "total_visits": total_visits,
                    "last_visit_date": last_visit_date,
                    "last_status": last_status,
                    "past_appointments": past_appointments_data,
                    "prescriptions": prescriptions_data,
                }
            )

        serializer = DoctorPatientSummarySerializer(
            results, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
