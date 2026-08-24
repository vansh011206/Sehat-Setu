"""
Serializers for e-Prescription management, medicine items, and public verification.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from apps.doctors.serializers import DoctorListSerializer
from .models import Prescription


def mask_patient_name(name: str) -> str:
    """Mask patient name for privacy in public verification (e.g. 'Aarav Kumar' -> 'A***v K***r')"""
    if not name:
        return "Patient"
    parts = name.strip().split()
    masked_parts = []
    for part in parts:
        if len(part) <= 2:
            masked_parts.append(part[0] + "*")
        else:
            masked_parts.append(part[0] + "*" * (len(part) - 2) + part[-1])
    return " ".join(masked_parts)


class MedicineItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    dosage = serializers.CharField(max_length=100, default="1 Tablet")
    frequency = serializers.CharField(max_length=100, default="1-0-1 (After Food)")
    duration = serializers.CharField(max_length=100, default="5 Days")
    instructions = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    medicines = MedicineItemSerializer(many=True, required=False)

    class Meta:
        model = Prescription
        fields = (
            "diagnosis",
            "medicines",
            "advice",
            "follow_up_in_days",
        )

    def validate_diagnosis(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Diagnosis must be at least 3 characters.")
        return value.strip()


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    doctor = DoctorListSerializer(read_only=True)
    patient = UserMinimalSerializer(read_only=True)
    pdf_url = serializers.SerializerMethodField()
    booking_code = serializers.CharField(source="appointment.booking_code", read_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id",
            "appointment",
            "booking_code",
            "doctor",
            "patient",
            "diagnosis",
            "medicines",
            "advice",
            "follow_up_in_days",
            "verification_code",
            "pdf_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None


class PrescriptionVerificationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    verification_code = serializers.CharField()
    doctor_name = serializers.CharField()
    doctor_registration = serializers.CharField()
    specialty = serializers.CharField()
    clinic_city = serializers.CharField()
    patient_name_masked = serializers.CharField()
    date = serializers.CharField()
    diagnosis = serializers.CharField()
    medicines_count = serializers.IntegerField()
    pdf_url = serializers.CharField(allow_null=True)


# Alias for backward compatibility
PrescriptionSerializer = PrescriptionDetailSerializer
