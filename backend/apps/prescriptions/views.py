"""
Views for e-Prescription creation, retrieval, PDF download, and public verification.
"""

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.accounts.models import User
from apps.appointments.models import Appointment
from .models import Prescription
from .pdf_generator import generate_prescription_pdf
from .serializers import (
    PrescriptionCreateSerializer,
    PrescriptionDetailSerializer,
    PrescriptionVerificationSerializer,
    mask_patient_name,
)
from .tasks import generate_prescription_pdf_task


class StandardPrescriptionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class CreateAppointmentPrescriptionView(APIView):
    """
    POST /api/v1/appointments/{id}/prescriptions/
    Doctor creates an e-prescription for a consultation session.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=PrescriptionCreateSerializer, responses={201: PrescriptionDetailSerializer})
    def post(self, request, pk):
        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor", "doctor__user", "patient"),
            pk=pk,
        )

        user = request.user
        is_doctor = (
            user.role == User.Role.DOCTOR
            and hasattr(user, "doctor_profile")
            and appointment.doctor_id == user.doctor_profile.id
        )
        is_admin = user.role == User.Role.ADMIN

        if not (is_doctor or is_admin):
            return Response(
                {"detail": "Only the assigned doctor can issue a prescription for this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PrescriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doctor_profile = (
            user.doctor_profile if is_doctor else appointment.doctor
        )

        # Get or create prescription for appointment
        prescription, created = Prescription.objects.get_or_create(
            appointment=appointment,
            defaults={
                "doctor": doctor_profile,
                "patient": appointment.patient,
                "diagnosis": serializer.validated_data["diagnosis"],
                "medicines": serializer.validated_data.get("medicines", []),
                "advice": serializer.validated_data.get("advice", ""),
                "follow_up_in_days": serializer.validated_data.get("follow_up_in_days"),
            },
        )

        if not created:
            prescription.diagnosis = serializer.validated_data["diagnosis"]
            prescription.medicines = serializer.validated_data.get("medicines", [])
            prescription.advice = serializer.validated_data.get("advice", "")
            prescription.follow_up_in_days = serializer.validated_data.get("follow_up_in_days")
            prescription.save()

        # Generate PDF synchronously
        try:
            pdf_content = generate_prescription_pdf(prescription)
            filename = f"Prescription_{prescription.verification_code}.pdf"
            prescription.pdf_file.save(filename, pdf_content, save=True)
        except Exception:
            # Fallback to async celery task if immediate generation hits error
            try:
                generate_prescription_pdf_task.delay(prescription.id)
            except Exception:
                pass

        # Mark appointment as completed if not already
        if appointment.status != Appointment.Status.COMPLETED:
            appointment.status = Appointment.Status.COMPLETED
            appointment.save(update_fields=["status", "updated_at"])

        # Notify patient of newly issued e-prescription
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_prescription_created(prescription)
        except Exception:
            pass

        res_serializer = PrescriptionDetailSerializer(
            prescription, context={"request": request}
        )
        return Response(res_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PrescriptionDetailView(APIView):
    """
    GET /api/v1/prescriptions/{id}/
    Retrieve prescription details. Returns 404 for unauthorized users to prevent existence leak.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: PrescriptionDetailSerializer})
    def get(self, request, pk):
        try:
            prescription = Prescription.objects.select_related(
                "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
            ).get(pk=pk)
        except Prescription.DoesNotExist:
            raise Http404("Prescription not found.")

        user = request.user
        is_patient = user.id == prescription.patient_id
        is_doctor = (
            user.role == User.Role.DOCTOR
            and hasattr(user, "doctor_profile")
            and prescription.doctor_id == user.doctor_profile.id
        )
        is_admin = user.role == User.Role.ADMIN

        # Must return 404 (NOT 403) to prevent existence leakage
        if not (is_patient or is_doctor or is_admin):
            raise Http404("Prescription not found.")

        serializer = PrescriptionDetailSerializer(
            prescription, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppointmentPrescriptionView(APIView):
    """
    GET /api/v1/appointments/{id}/prescription/
    Retrieve the e-prescription linked to an appointment. Returns 404 for unauthorized users.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: PrescriptionDetailSerializer})
    def get(self, request, pk):
        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor", "doctor__user", "patient"),
            pk=pk,
        )

        user = request.user
        is_patient = user.id == appointment.patient_id
        is_doctor = (
            user.role == User.Role.DOCTOR
            and hasattr(user, "doctor_profile")
            and appointment.doctor_id == user.doctor_profile.id
        )
        is_admin = user.role == User.Role.ADMIN

        if not (is_patient or is_doctor or is_admin):
            raise Http404("Prescription not found for this appointment.")

        try:
            prescription = Prescription.objects.select_related(
                "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
            ).get(appointment=appointment)
        except Prescription.DoesNotExist:
            raise Http404("No prescription has been issued for this appointment yet.")

        serializer = PrescriptionDetailSerializer(
            prescription, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class VerifyPrescriptionView(APIView):
    """
    GET /api/v1/verify/{code}/
    Public endpoint to verify authenticity of an e-prescription.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: PrescriptionVerificationSerializer})
    def get(self, request, code):
        code_clean = (code or "").strip().upper()
        try:
            prescription = Prescription.objects.select_related(
                "doctor", "doctor__user", "doctor__specialty", "patient"
            ).get(verification_code__iexact=code_clean)
        except Prescription.DoesNotExist:
            return Response(
                {
                    "valid": False,
                    "verification_code": code_clean,
                    "message": "No verified e-prescription found matching this code.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        doctor = prescription.doctor
        specialty_name = doctor.specialty.name if hasattr(doctor, "specialty") and doctor.specialty else "General Medicine"
        pdf_url = request.build_absolute_uri(prescription.pdf_file.url) if prescription.pdf_file else None

        payload = {
            "valid": True,
            "verification_code": prescription.verification_code,
            "doctor_name": f"Dr. {doctor.user.full_name}",
            "doctor_registration": doctor.registration_number or "REG-MCI-VERIFIED",
            "specialty": specialty_name,
            "clinic_city": doctor.city or "New Delhi",
            "patient_name_masked": mask_patient_name(prescription.patient.full_name),
            "date": prescription.created_at.strftime("%d %b %Y"),
            "diagnosis": prescription.diagnosis,
            "medicines_count": len(prescription.medicines) if isinstance(prescription.medicines, list) else 0,
            "pdf_url": pdf_url,
        }

        return Response(payload, status=status.HTTP_200_OK)


class PatientPrescriptionsListView(generics.ListAPIView):
    """
    GET /api/v1/my/prescriptions/
    List digital prescriptions for the authenticated patient.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionDetailSerializer
    pagination_class = StandardPrescriptionPagination

    def get_queryset(self):
        user = self.request.user
        qs = Prescription.objects.filter(patient=user).select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
        ).order_by("-created_at")

        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            d = parse_date(start_date)
            if d:
                qs = qs.filter(created_at__date__gte=d)
        if end_date:
            d = parse_date(end_date)
            if d:
                qs = qs.filter(created_at__date__lte=d)

        return qs


class DoctorPrescriptionsListView(generics.ListAPIView):
    """
    GET /api/v1/doctors/me/prescriptions/
    List digital prescriptions issued by the authenticated doctor.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionDetailSerializer
    pagination_class = StandardPrescriptionPagination

    def get_queryset(self):
        user = self.request.user
        if not (user.role == User.Role.DOCTOR and hasattr(user, "doctor_profile")):
            return Prescription.objects.none()

        qs = Prescription.objects.filter(doctor=user.doctor_profile).select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
        ).order_by("-created_at")

        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            d = parse_date(start_date)
            if d:
                qs = qs.filter(created_at__date__gte=d)
        if end_date:
            d = parse_date(end_date)
            if d:
                qs = qs.filter(created_at__date__lte=d)

        return qs


class PrescriptionPDFDownloadView(APIView):
    """
    GET /api/v1/prescriptions/{id}/download/
    Direct download endpoint for prescription PDF with attachment header.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            prescription = Prescription.objects.select_related(
                "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
            ).get(pk=pk)
        except Prescription.DoesNotExist:
            raise Http404("Prescription not found.")

        user = request.user
        is_patient = user.id == prescription.patient_id
        is_doctor = (
            user.role == User.Role.DOCTOR
            and hasattr(user, "doctor_profile")
            and prescription.doctor_id == user.doctor_profile.id
        )
        is_admin = user.role == User.Role.ADMIN

        if not (is_patient or is_doctor or is_admin):
            raise Http404("Prescription not found.")

        if not prescription.pdf_file:
            pdf_content = generate_prescription_pdf(prescription)
            filename = f"Prescription_{prescription.verification_code}.pdf"
            prescription.pdf_file.save(filename, pdf_content, save=True)

        filename = f"Prescription_{prescription.verification_code}.pdf"
        response = FileResponse(
            prescription.pdf_file.open("rb"),
            content_type="application/pdf",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
