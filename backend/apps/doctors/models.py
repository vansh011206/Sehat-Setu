"""
Doctor profile, Specialty, and Review models for SehatSetu.
"""

from decimal import Decimal
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils.text import slugify


class Specialty(models.Model):
    """
    Medical specialties (e.g. Cardiology, Dermatology, Pediatrics).
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    icon_name = models.CharField(
        max_length=50,
        default="stethoscope",
        help_text="Lucide icon name (e.g., heart-pulse, sparkles, baby).",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Specialty"
        verbose_name_plural = "Specialties"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class DoctorProfile(models.Model):
    """
    Profile extension for doctors with professional credentials,
    pricing, location, and rating telemetry.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctors",
    )
    qualification = models.CharField(
        max_length=150,
        blank=True,
        help_text="e.g. MBBS, MD (Cardiology), DM (AIIMS)",
    )
    years_of_experience = models.PositiveIntegerField(
        default=0,
        help_text="Total years of clinical practice.",
    )
    registration_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="State Medical Council or MCI registration number.",
    )
    bio = models.TextField(blank=True, help_text="Doctor introduction and experience summary.")
    city = models.CharField(max_length=100, blank=True, db_index=True)
    consultation_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("500.00"),
        db_index=True,
        help_text="Consultation fee in INR.",
    )
    clinic_name = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
        db_index=True,
        help_text="Average rating score from 0.00 to 5.00.",
    )
    rating_count = models.PositiveIntegerField(
        default=0,
        help_text="Total verified patient reviews.",
    )
    is_available = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether doctor is currently accepting bookings.",
    )
    profile_picture = models.ImageField(
        upload_to="doctors/%Y/%m/",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Doctor Profile"
        verbose_name_plural = "Doctor Profiles"
        ordering = ["-avg_rating", "-years_of_experience"]
        indexes = [
            models.Index(fields=["city"]),
            models.Index(fields=["specialty"]),
            models.Index(fields=["avg_rating"]),
            models.Index(fields=["consultation_fee"]),
            models.Index(fields=["is_available"]),
        ]

    def __str__(self):
        specialty_name = self.specialty.name if self.specialty else "General"
        return f"Dr. {self.user.full_name} ({specialty_name}) - {self.city}"

    def update_rating_stats(self):
        """Recomputes avg_rating and rating_count from actual Review records."""
        stats = self.reviews.aggregate(avg=Avg("rating"), count=Count("id"))
        self.avg_rating = round(Decimal(str(stats["avg"] or 0.0)), 2)
        self.rating_count = stats["count"] or 0
        self.save(update_fields=["avg_rating", "rating_count"])

    @property
    def is_profile_complete(self) -> bool:
        return bool(
            self.qualification
            and self.registration_number
            and self.specialty
            and self.city
            and self.consultation_fee > 0
        )


class Review(models.Model):
    """
    Patient review for a verified completed consultation.
    One review per patient per doctor.
    """

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Star rating from 1 to 5.",
    )
    review_text = models.TextField(blank=True, help_text="Detailed feedback.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Doctor Review"
        verbose_name_plural = "Doctor Reviews"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "patient"],
                name="unique_doctor_patient_review",
            )
        ]

    def __str__(self):
        return f"Review by {self.patient.full_name} for Dr. {self.doctor.user.full_name} ({self.rating} stars)"


@receiver(post_save, sender=Review)
def update_doctor_rating_on_save(sender, instance, **kwargs):
    instance.doctor.update_rating_stats()


@receiver(post_delete, sender=Review)
def update_doctor_rating_on_delete(sender, instance, **kwargs):
    instance.doctor.update_rating_stats()
