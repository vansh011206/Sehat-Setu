"""
Serializers for Doctors, Specialties, and Reviews in SehatSetu.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import DoctorProfile, Review, Specialty


class SpecialtySerializer(serializers.ModelSerializer):
    """Serializer for medical specialties."""

    doctor_count = serializers.SerializerMethodField()

    class Meta:
        model = Specialty
        fields = (
            "id",
            "name",
            "slug",
            "icon_name",
            "description",
            "doctor_count",
        )

    def get_doctor_count(self, obj) -> int:
        if hasattr(obj, "doctor_count_annotated"):
            return obj.doctor_count_annotated
        return obj.doctors.filter(user__is_active=True).count()


def mask_patient_name(full_name: str) -> str:
    """Masks patient name for privacy, e.g. 'Aarav Kumar' -> 'Aarav K.'."""
    if not full_name:
        return "Patient"
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


class ReviewSerializer(serializers.ModelSerializer):
    """Review item serializer with masked patient name."""

    patient_name = serializers.SerializerMethodField()
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "patient_id",
            "patient_name",
            "rating",
            "review_text",
            "created_at",
        )
        read_only_fields = ("id", "patient_id", "patient_name", "created_at")

    def get_patient_name(self, obj) -> str:
        return mask_patient_name(obj.patient.full_name)


class DoctorListSerializer(serializers.ModelSerializer):
    """
    Compact doctor card serializer optimized for directory list and search.
    """

    name = serializers.CharField(source="user.full_name", read_only=True)
    photo = serializers.SerializerMethodField()
    specialty = SpecialtySerializer(read_only=True)
    fee = serializers.DecimalField(
        source="consultation_fee", max_digits=8, decimal_places=2, read_only=True
    )
    experience = serializers.IntegerField(
        source="years_of_experience", read_only=True
    )

    class Meta:
        model = DoctorProfile
        fields = (
            "id",
            "name",
            "photo",
            "specialty",
            "qualification",
            "city",
            "clinic_name",
            "fee",
            "avg_rating",
            "rating_count",
            "experience",
            "is_available",
        )

    def get_photo(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.profile_picture:
            url = obj.profile_picture.url
            return request.build_absolute_uri(url) if request else url
        if obj.user.profile_picture:
            url = obj.user.profile_picture.url
            return request.build_absolute_uri(url) if request else url
        return None


class DoctorDetailSerializer(serializers.ModelSerializer):
    """
    Full doctor profile serializer with recent reviews and star breakdown statistics.
    """

    name = serializers.CharField(source="user.full_name", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    photo = serializers.SerializerMethodField()
    specialty = SpecialtySerializer(read_only=True)
    fee = serializers.DecimalField(
        source="consultation_fee", max_digits=8, decimal_places=2, read_only=True
    )
    experience = serializers.IntegerField(
        source="years_of_experience", read_only=True
    )
    recent_reviews = serializers.SerializerMethodField()
    star_distribution = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = (
            "id",
            "name",
            "phone",
            "email",
            "photo",
            "specialty",
            "qualification",
            "experience",
            "registration_number",
            "bio",
            "city",
            "clinic_name",
            "clinic_address",
            "fee",
            "avg_rating",
            "rating_count",
            "is_available",
            "recent_reviews",
            "star_distribution",
            "created_at",
            "updated_at",
        )

    def get_photo(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.profile_picture:
            url = obj.profile_picture.url
            return request.build_absolute_uri(url) if request else url
        if obj.user.profile_picture:
            url = obj.user.profile_picture.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_recent_reviews(self, obj):
        reviews = obj.reviews.select_related("patient").order_by("-created_at")[:5]
        return ReviewSerializer(reviews, many=True).data

    def get_star_distribution(self, obj) -> dict[int, int]:
        distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for star in range(1, 6):
            distribution[star] = obj.reviews.filter(rating=star).count()
        return distribution


class CreateReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a doctor review.
    """

    class Meta:
        model = Review
        fields = ("rating", "review_text")

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


# Backward compatible alias for other apps
DoctorProfileSerializer = DoctorDetailSerializer
