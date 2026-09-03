"""
Management command to seed SehatSetu with demo data for 2-minute instant demonstration.
Creates 4 doctors (Cardiology, Dermatology, Orthopedics, Gynecology), 3 patients,
availability rules, 2 completed appointments (with prescription & review), and 2 upcoming appointments.
"""

from datetime import datetime, timedelta
from decimal import Decimal
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.doctors.models import DoctorProfile, Review, Specialty
from apps.prescriptions.models import Prescription
from apps.notifications.services import NotificationService
from apps.admin_api.tasks import populate_recent_daily_snapshots

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Resets test data and seeds SehatSetu with complete demo clinical dataset."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting SehatSetu Demo Dataset Seeding..."))

        # 1. Clean existing non-superuser accounts & test data cleanly
        Prescription.objects.all().delete()
        Review.objects.all().delete()
        Appointment.objects.all().delete()
        AvailabilityRule.objects.all().delete()
        DoctorProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # 2. Seed Specialties
        specialties_data = [
            ("Cardiology", "Heart health & cardiovascular care"),
            ("Dermatology", "Skin, hair, & nail conditions"),
            ("Orthopedics", "Bone, joint, & muscular health"),
            ("Gynecology", "Women's reproductive & maternity care"),
        ]

        spec_map = {}
        for name, desc in specialties_data:
            spec, _ = Specialty.objects.get_or_create(
                name=name, defaults={"description": desc, "icon_name": "heart"}
            )
            spec_map[name] = spec

        # 3. Create Super Admin
        admin_user, _ = User.objects.get_or_create(
            phone="+919876543210",
            defaults={
                "email": "admin@sehatsetu.com",
                "full_name": "System Administrator",
                "role": User.Role.ADMIN,
                "is_staff": True,
            },
        )
        admin_user.set_password("Demo@1234")
        admin_user.save()

        # 4. Create 4 Doctors
        doctors_info = [
            {
                "phone": "+919876543212",
                "email": "dr.sharma@sehatsetu.com",
                "full_name": "Rajesh Sharma",
                "specialty": "Cardiology",
                "qualification": "MBBS, MD (Cardiology), DM (AIIMS)",
                "experience_years": 15,
                "city": "New Delhi",
                "fee": Decimal("800.00"),
                "bio": "Senior Interventional Cardiologist with 15+ years of experience in preventive cardiology and hypertension management.",
            },
            {
                "phone": "+919876543213",
                "email": "dr.patel@sehatsetu.com",
                "full_name": "Priya Patel",
                "specialty": "Dermatology",
                "qualification": "MBBS, MD (Dermatology & Venereology)",
                "experience_years": 10,
                "city": "Bengaluru",
                "fee": Decimal("600.00"),
                "bio": "Consultant Dermatologist specializing in aesthetic dermatology, acne therapy, and chronic skin disease management.",
            },
            {
                "phone": "+919876543214",
                "email": "dr.singh@sehatsetu.com",
                "full_name": "Vikram Singh",
                "specialty": "Orthopedics",
                "qualification": "MBBS, MS (Orthopedics), M.Ch (UK)",
                "experience_years": 12,
                "city": "Mumbai",
                "fee": Decimal("750.00"),
                "bio": "Orthopedic surgeon specializing in sports medicine, arthroscopy, and joint preservation therapies.",
            },
            {
                "phone": "+919876543215",
                "email": "dr.roy@sehatsetu.com",
                "full_name": "Anita Roy",
                "specialty": "Gynecology",
                "qualification": "MBBS, MD (Obstetrics & Gynecology)",
                "experience_years": 14,
                "city": "Kolkata",
                "fee": Decimal("700.00"),
                "bio": "Senior Gynecologist & Obstetrician focused on women's wellness, prenatal care, and reproductive health.",
            },
        ]

        doc_profiles = []
        for d in doctors_info:
            user = User.objects.create(
                phone=d["phone"],
                email=d["email"],
                full_name=d["full_name"],
                role=User.Role.DOCTOR,
            )
            user.set_password("Demo@1234")
            user.save()

            profile = DoctorProfile.objects.create(
                user=user,
                specialty=spec_map[d["specialty"]],
                qualification=d["qualification"],
                years_of_experience=d["experience_years"],
                city=d["city"],
                consultation_fee=d["fee"],
                bio=d["bio"],
                is_available=True,
                registration_number=f"MCI-{user.id * 11111}",
            )
            doc_profiles.append(profile)

            # Create recurring availability rules (Mon-Sat, 09:00 - 17:00)
            for day_num in range(1, 7):
                AvailabilityRule.objects.create(
                    doctor=profile,
                    weekday=day_num,
                    start_time="09:00:00",
                    end_time="17:00:00",
                    slot_duration=30,
                )

        # 5. Create 3 Patients
        patients_info = [
            {"phone": "+919876543211", "email": "aarav@example.com", "name": "Aarav Kumar"},
            {"phone": "+919876543216", "email": "sunita@example.com", "name": "Sunita Devi"},
            {"phone": "+919876543217", "email": "rahul@example.com", "name": "Rahul Verma"},
        ]

        patient_users = []
        for p in patients_info:
            user = User.objects.create(
                phone=p["phone"],
                email=p["email"],
                full_name=p["name"],
                role=User.Role.PATIENT,
            )
            user.set_password("Demo@1234")
            user.save()
            patient_users.append(user)

        aarav = patient_users[0]
        sunita = patient_users[1]
        dr_sharma = doc_profiles[0]  # Cardio
        dr_patel = doc_profiles[1]   # Derm

        now = timezone.now()

        # 6. Seed 2 Completed Appointments
        # Appt 1: Aarav with Dr. Sharma (Yesterday)
        past_start1 = now - timedelta(days=1, hours=2)
        past_end1 = past_start1 + timedelta(minutes=30)

        completed_appt1 = Appointment.objects.create(
            doctor=dr_sharma,
            patient=aarav,
            start_time=past_start1,
            end_time=past_end1,
            fee_at_booking=dr_sharma.consultation_fee,
            status=Appointment.Status.COMPLETED,
            symptoms="Mild chest tightness after physical exertion and routine ECG review.",
        )

        # Create Prescription for Appt 1
        Prescription.objects.create(
            appointment=completed_appt1,
            doctor=dr_sharma,
            patient=aarav,
            medicines=[
                {
                    "name": "Tab Telmisartan",
                    "dosage": "40 mg",
                    "frequency": "Once daily (Morning)",
                    "duration": "30 Days",
                    "instructions": "Take after breakfast with water.",
                },
                {
                    "name": "Tab Atorvastatin",
                    "dosage": "10 mg",
                    "frequency": "Once daily (Night)",
                    "duration": "30 Days",
                    "instructions": "Take before bedtime.",
                },
            ],
            diagnosis="Primary Essential Hypertension (Stage I)",
            advice="Maintain low sodium diet (<2g/day). Perform 30 minutes of moderate aerobic exercise daily. Avoid high lipid processed foods.",
            follow_up_in_days=30,
        )

        # Create Review for Appt 1
        Review.objects.create(
            doctor=dr_sharma,
            patient=aarav,
            rating=5,
            review_text="Dr. Rajesh Sharma was very patient and explained my ECG results thoroughly. Highly recommended!",
        )

        # Appt 2: Sunita with Dr. Patel (2 Days Ago)
        past_start2 = now - timedelta(days=2, hours=4)
        past_end2 = past_start2 + timedelta(minutes=30)

        completed_appt2 = Appointment.objects.create(
            doctor=dr_patel,
            patient=sunita,
            start_time=past_start2,
            end_time=past_end2,
            fee_at_booking=dr_patel.consultation_fee,
            status=Appointment.Status.COMPLETED,
            symptoms="Skin redness and seasonal facial allergy flares.",
        )

        Review.objects.create(
            doctor=dr_patel,
            patient=sunita,
            rating=5,
            review_text="Dr. Patel prescribed an effective topical ointment. Clear diagnosis!",
        )

        # Update Doctor Rating Aggregates
        for doc in doc_profiles:
            doc.update_rating_stats()

        # 7. Seed 2 Upcoming Appointments (Ready for instant Video Demo)
        # Upcoming 1: Aarav with Dr. Sharma (Starts in 10 mins)
        upcoming_start1 = now + timedelta(minutes=10)
        upcoming_end1 = upcoming_start1 + timedelta(minutes=30)

        upcoming_appt1 = Appointment.objects.create(
            doctor=dr_sharma,
            patient=aarav,
            start_time=upcoming_start1,
            end_time=upcoming_end1,
            fee_at_booking=dr_sharma.consultation_fee,
            status=Appointment.Status.CONFIRMED,
            symptoms="Follow-up consultation regarding blood pressure stabilization.",
        )

        # Upcoming 2: Sunita with Dr. Patel (Tomorrow at 11:00 AM)
        tomorrow = (now + timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0)
        upcoming_appt2 = Appointment.objects.create(
            doctor=dr_patel,
            patient=sunita,
            start_time=tomorrow,
            end_time=tomorrow + timedelta(minutes=30),
            fee_at_booking=dr_patel.consultation_fee,
            status=Appointment.Status.CONFIRMED,
            symptoms="Routine skin health assessment and moisturizer review.",
        )

        # 8. Trigger initial notification for Demo
        NotificationService.notify_appointment_booked(upcoming_appt1)

        # 9. Backfill Admin Daily Stats Snapshots
        populate_recent_daily_snapshots(30)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSuccessfully seeded SehatSetu Demo Dataset!\n"
                f"- Super Admin: +919876543210 / Demo@1234\n"
                f"- Doctor (Dr. Sharma): +919876543212 / Demo@1234\n"
                f"- Doctor (Dr. Patel): +919876543213 / Demo@1234\n"
                f"- Patient (Aarav Kumar): +919876543211 / Demo@1234\n"
                f"- 2 Completed Appointments with Prescription & Review\n"
                f"- 2 Upcoming Appointments (Live Video Telehealth Ready: Appointment #{upcoming_appt1.id})\n"
            )
        )
