"""
User model and custom user manager for SehatSetu.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models


phone_validator = RegexValidator(
    regex=r"^\+?[1-9]\d{9,14}$",
    message="Phone number must be entered in the format: '+919876543210' or '9876543210'. Up to 15 digits allowed.",
)


class UserManager(BaseUserManager):
    """
    Custom manager for User model where phone is the unique identifier
    for authentication instead of usernames.
    """

    use_in_migrations = True

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("The Phone number must be set")
        phone = phone.strip()
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(phone, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model for SehatSetu supporting Patient, Doctor, and Admin roles.
    """

    class Role(models.TextChoices):
        PATIENT = "PATIENT", "Patient"
        DOCTOR = "DOCTOR", "Doctor"
        ADMIN = "ADMIN", "Admin"

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    username = None  # Remove username field
    phone = models.CharField(
        max_length=15,
        unique=True,
        db_index=True,
        validators=[phone_validator],
        help_text="Primary identifier for authentication.",
    )
    email = models.EmailField(
        blank=True,
        null=True,
        unique=True,
        help_text="Optional email address.",
    )
    full_name = models.CharField(max_length=150, help_text="User's full name.")
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
        db_index=True,
    )
    profile_picture = models.ImageField(
        upload_to="profiles/%Y/%m/",
        blank=True,
        null=True,
    )
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True,
        null=True,
    )
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.phone}) - {self.role}"

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN or self.is_superuser
