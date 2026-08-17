"""
Serializers for User authentication and profile management.
"""

import re
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, phone_validator


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal representation of a user."""

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "profile_picture",
            "gender",
            "date_of_birth",
        )
        read_only_fields = ("id", "phone", "role")


class UserSerializer(serializers.ModelSerializer):
    """Full user profile serializer."""

    doctor_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "profile_picture",
            "gender",
            "date_of_birth",
            "created_at",
            "updated_at",
            "doctor_profile",
        )
        read_only_fields = ("id", "phone", "role", "created_at", "updated_at")

    def get_doctor_profile(self, obj):
        if obj.role == User.Role.DOCTOR and hasattr(obj, "doctor_profile"):
            from apps.doctors.serializers import DoctorProfileSerializer

            return DoctorProfileSerializer(obj.doctor_profile).data
        return None


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Supports creating both PATIENT and DOCTOR accounts in one flow.
    """

    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    confirm_password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    # Optional fields for Doctor profile setup during registration
    specialty_id = serializers.IntegerField(required=False, write_only=True, allow_null=True)
    qualification = serializers.CharField(required=False, write_only=True, allow_blank=True)
    years_of_experience = serializers.IntegerField(required=False, write_only=True, default=0)
    registration_number = serializers.CharField(required=False, write_only=True, allow_blank=True)
    bio = serializers.CharField(required=False, write_only=True, allow_blank=True)
    city = serializers.CharField(required=False, write_only=True, allow_blank=True)
    consultation_fee = serializers.DecimalField(
        required=False, write_only=True, max_digits=8, decimal_places=2, default=500.00
    )
    clinic_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    clinic_address = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "phone",
            "full_name",
            "email",
            "password",
            "confirm_password",
            "role",
            "gender",
            "date_of_birth",
            "specialty_id",
            "qualification",
            "years_of_experience",
            "registration_number",
            "bio",
            "city",
            "consultation_fee",
            "clinic_name",
            "clinic_address",
        )

    def validate_phone(self, value):
        phone = value.strip()
        if not re.match(r"^\+?[1-9]\d{9,14}$", phone):
            raise serializers.ValidationError(
                "Enter a valid phone number with country code, e.g. +919876543210."
            )
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return phone

    def validate_email(self, value):
        if value:
            email = value.strip().lower()
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError("A user with this email already exists.")
            return email
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Validate password strength using Django's validators
        temp_user = User(
            phone=attrs.get("phone"),
            full_name=attrs.get("full_name"),
            email=attrs.get("email"),
        )
        validate_password(attrs["password"], temp_user)
        return attrs

    def create(self, validated_data):
        # Extract doctor profile data if provided
        specialty_id = validated_data.pop("specialty_id", None)
        qualification = validated_data.pop("qualification", "")
        years_of_experience = validated_data.pop("years_of_experience", 0)
        registration_number = validated_data.pop("registration_number", "")
        bio = validated_data.pop("bio", "")
        city = validated_data.pop("city", "")
        consultation_fee = validated_data.pop("consultation_fee", 500.00)
        clinic_name = validated_data.pop("clinic_name", "")
        clinic_address = validated_data.pop("clinic_address", "")

        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User.objects.create_user(password=password, **validated_data)

        # Auto-create DoctorProfile when role is DOCTOR
        if user.role == User.Role.DOCTOR:
            from apps.doctors.models import DoctorProfile, Specialty

            specialty = None
            if specialty_id:
                try:
                    specialty = Specialty.objects.get(id=specialty_id)
                except Specialty.DoesNotExist:
                    pass

            DoctorProfile.objects.create(
                user=user,
                specialty=specialty,
                qualification=qualification,
                years_of_experience=years_of_experience,
                registration_number=registration_number,
                bio=bio,
                city=city,
                consultation_fee=consultation_fee,
                clinic_name=clinic_name,
                clinic_address=clinic_address,
            )

        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login supporting Phone or Email.
    """

    login = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Phone number or Email address",
    )
    phone_or_email = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Phone number or Email address alias",
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        login_input = (
            attrs.get("login")
            or attrs.get("phone_or_email")
            or attrs.get("phone")
            or ""
        ).strip()
        password = attrs.get("password")

        if not login_input:
            raise serializers.ValidationError("Phone or Email is required.")

        user = None

        # Check if login_input is phone or email
        if "@" in login_input:
            try:
                user_obj = User.objects.get(email__iexact=login_input)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass
        else:
            try:
                user_obj = User.objects.get(phone=login_input)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                # Also try matching with/without '+91'
                if not login_input.startswith("+"):
                    clean_digits = "".join(filter(str.isdigit, login_input))
                    if len(clean_digits) == 10:
                        try:
                            user_obj = User.objects.get(phone=f"+91{clean_digits}")
                            if user_obj.check_password(password):
                                user = user_obj
                        except User.DoesNotExist:
                            pass
                elif login_input.startswith("+91"):
                    raw_phone = login_input[3:]
                    try:
                        user_obj = User.objects.get(phone=raw_phone)
                        if user_obj.check_password(password):
                            user = user_obj
                    except User.DoesNotExist:
                        pass

        if not user:
            raise serializers.ValidationError("Invalid phone/email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is inactive.")

        refresh = RefreshToken.for_user(user)

        return {
            "user": user,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password when authenticated.
    """

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
