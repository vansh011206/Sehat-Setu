"""
Management command to seed demo users (Admin, Patient, Doctors) and initial availability rules.
"""

from datetime import datetime, time, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.doctors.models import DoctorProfile, Review, Specialty


class Command(BaseCommand):
    help = "Seed demo users for SehatSetu (Admin, Patient, Doctors) with password Demo@1234"

    def handle(self, *args, **options):
        password = "Demo@1234"

        # 1. Admin User
        admin, created = User.objects.get_or_create(
            phone="+919876543210",
            defaults={
                "full_name": "System Administrator",
                "email": "admin@sehatsetu.com",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password(password)
        admin.save()
        self.stdout.write(self.style.SUCCESS(f"Configured Admin: {admin.phone}"))

        # 2. Patient User
        patient, created = User.objects.get_or_create(
            phone="+919876543211",
            defaults={
                "full_name": "Aarav Kumar",
                "email": "patient@sehatsetu.com",
                "role": User.Role.PATIENT,
                "gender": User.Gender.MALE,
            },
        )
        patient.set_password(password)
        patient.save()
        self.stdout.write(self.style.SUCCESS(f"Configured Patient: {patient.phone}"))

        # Ensure specialties exist
        cardio, _ = Specialty.objects.get_or_create(
            slug="cardiology",
            defaults={
                "name": "Cardiology",
                "icon_name": "heart-pulse",
                "description": "Heart and cardiovascular system care.",
            },
        )
        derma, _ = Specialty.objects.get_or_create(
            slug="dermatology",
            defaults={
                "name": "Dermatology",
                "icon_name": "sparkles",
                "description": "Skin, hair, and nail health specialists.",
            },
        )

        # 3. Doctor 1 (Cardiologist)
        doc1_user, _ = User.objects.get_or_create(
            phone="+919876543212",
            defaults={
                "full_name": "Rajesh Sharma",
                "email": "dr.sharma@sehatsetu.com",
                "role": User.Role.DOCTOR,
                "gender": User.Gender.MALE,
            },
        )
        doc1_user.set_password(password)
        doc1_user.save()

        doc1_profile, _ = DoctorProfile.objects.update_or_create(
            user=doc1_user,
            defaults={
                "specialty": cardio,
                "qualification": "MBBS, MD (Cardiology), DM (AIIMS)",
                "years_of_experience": 14,
                "registration_number": "MCI-CARD-2012-8874",
                "bio": "Senior Consultant Interventional Cardiologist with extensive experience in preventative heart care and cardiac rehabilitation.",
                "city": "New Delhi",
                "consultation_fee": Decimal("800.00"),
                "clinic_name": "Heart Health Medicare Center",
                "clinic_address": "Suite 402, Ring Road Plaza, South Extension, New Delhi",
                "is_available": True,
            },
        )

        # 4. Doctor 2 (Dermatologist)
        doc2_user, _ = User.objects.get_or_create(
            phone="+919876543213",
            defaults={
                "full_name": "Priya Patel",
                "email": "dr.patel@sehatsetu.com",
                "role": User.Role.DOCTOR,
                "gender": User.Gender.FEMALE,
            },
        )
        doc2_user.set_password(password)
        doc2_user.save()

        doc2_profile, _ = DoctorProfile.objects.update_or_create(
            user=doc2_user,
            defaults={
                "specialty": derma,
                "qualification": "MBBS, MD (Dermatology & Venereology)",
                "years_of_experience": 9,
                "registration_number": "GMC-DERM-2015-4421",
                "bio": "Specialist in clinical dermatology, aesthetic laser care, and pediatric skin conditions.",
                "city": "Bengaluru",
                "consultation_fee": Decimal("600.00"),
                "clinic_name": "Aura Skin & Hair Clinic",
                "clinic_address": "88 Indiranagar 100ft Road, Bengaluru, Karnataka",
                "is_available": True,
            },
        )

        # 5. Availability Rules (Mon-Sat 09:00 - 17:00, 30 min slots)
        for doc_prof in [doc1_profile, doc2_profile]:
            for weekday in range(1, 7):  # Mon-Sat
                AvailabilityRule.objects.update_or_create(
                    doctor=doc_prof,
                    weekday=weekday,
                    defaults={
                        "start_time": time(9, 0),
                        "end_time": time(17, 0),
                        "slot_duration": 30,
                        "is_active": True,
                    },
                )

        # 6. Seed a completed appointment so review flow can be tested immediately
        past_time = timezone.now() - timedelta(days=2)
        past_apt, _ = Appointment.objects.get_or_create(
            doctor=doc1_profile,
            patient=patient,
            status=Appointment.Status.COMPLETED,
            defaults={
                "start_time": past_time,
                "end_time": past_time + timedelta(minutes=30),
                "fee_at_booking": Decimal("800.00"),
                "symptoms": "Routine cardiac checkup & blood pressure assessment.",
            },
        )

        # 7. Seed sample reviews
        Review.objects.update_or_create(
            doctor=doc1_profile,
            patient=patient,
            defaults={
                "rating": 5,
                "review_text": "Extremely thorough and attentive cardiologist. Explained every ECG aspect clearly and gave practical lifestyle advice.",
            },
        )

        # Re-sync stats
        doc1_profile.update_rating_stats()
        doc2_profile.update_rating_stats()

        self.stdout.write(
            self.style.SUCCESS(
                "\n[SUCCESS] Seeded demo accounts, availability rules, and test records.\n"
                "  Admin:   +919876543210 (Demo@1234)\n"
                "  Patient: +919876543211 (Demo@1234)\n"
                "  Doctor:  +919876543212 (Demo@1234)\n"
                "  Doctor:  +919876543213 (Demo@1234)\n"
            )
        )
