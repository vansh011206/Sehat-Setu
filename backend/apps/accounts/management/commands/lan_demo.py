# LAN demo: Management command to seed local Wi-Fi testing dataset
"""
Management command to seed SehatSetu with a lightweight, idempotent local WiFi (LAN) demo dataset.
Creates:
  - Doctor: Dr. Aarti Sharma (Cardiologist, Faridabad, fee Rs. 800, phone 9999900001, password Demo@1234)
  - Patient: Rahul Verma (phone 9999900002, password Demo@1234)
  - AvailabilityRule: Today & Tomorrow, 15-min slots, open for next 3 hours
  - Confirmed Appointment: Starts in 2 mins, booking_code "LAN-VIDEO-1"
  - Prints ready-to-use LAN URLs for phone & laptop testing.
"""

from datetime import datetime, timedelta
from decimal import Decimal
import logging
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.doctors.models import DoctorProfile, Specialty
from apps.notifications.services import NotificationService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seeds idempotent SehatSetu accounts and confirmed appointment for Local WiFi (LAN) multi-device testing."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Configuring SehatSetu Local WiFi (LAN) Demo Environment..."))

        # 1. Detect LAN IP from settings or helper
        lan_ip = getattr(settings, "LAN_IP", "127.0.0.1")

        # 2. Get or create Specialty
        cardio_spec, _ = Specialty.objects.get_or_create(
            name="Cardiology",
            defaults={
                "description": "Heart health, rhythm, and cardiovascular care",
                "icon_name": "heart",
            },
        )

        # 3. Doctor User & Profile
        doc_phone = "9999900001"
        doc_user, created = User.objects.get_or_create(
            phone=doc_phone,
            defaults={
                "email": "dr.aarti@sehatsetu.com",
                "full_name": "Dr. Aarti Sharma",
                "role": User.Role.DOCTOR,
            },
        )
        if not created:
            doc_user.full_name = "Dr. Aarti Sharma"
            doc_user.role = User.Role.DOCTOR
            doc_user.email = "dr.aarti@sehatsetu.com"
        doc_user.set_password("Demo@1234")
        doc_user.save()

        doc_profile, _ = DoctorProfile.objects.update_or_create(
            user=doc_user,
            defaults={
                "specialty": cardio_spec,
                "qualification": "MBBS, MD (Cardiology), DM (Cardiology, AIIMS)",
                "years_of_experience": 10,
                "city": "Faridabad",
                "consultation_fee": Decimal("800.00"),
                "bio": "Senior Interventional Cardiologist with 10+ years specializing in heart care, hypertension management, and preventive telehealth.",
                "clinic_name": "Sharma Heart & Vascular Clinic",
                "clinic_address": "Plot 42, Sector 15, Near Metro Station, Faridabad, Haryana",
                "registration_number": "HR-MCI-48201",
                "is_available": True,
            },
        )

        # 4. Patient User
        patient_phone = "9999900002"
        patient_user, p_created = User.objects.get_or_create(
            phone=patient_phone,
            defaults={
                "email": "rahul.verma@example.com",
                "full_name": "Rahul Verma",
                "role": User.Role.PATIENT,
            },
        )
        if not p_created:
            patient_user.full_name = "Rahul Verma"
            patient_user.role = User.Role.PATIENT
            patient_user.email = "rahul.verma@example.com"
        patient_user.set_password("Demo@1234")
        patient_user.save()

        # 5. Availability Rules for Today and Tomorrow (15 min slots, 3-hour window)
        now_local = timezone.localtime()
        today_weekday = now_local.isoweekday()  # 1 = Monday, 7 = Sunday
        tomorrow_weekday = (today_weekday % 7) + 1

        # Calculate start_time rounded to next 15-minute mark
        start_candidate = now_local + timedelta(minutes=30)
        minute_rem = start_candidate.minute % 15
        if minute_rem != 0:
            start_candidate += timedelta(minutes=(15 - minute_rem))
        start_candidate = start_candidate.replace(second=0, microsecond=0)
        end_candidate = start_candidate + timedelta(hours=3)

        # Handle midnight rollover gracefully: if candidate window crosses midnight or is late, use 08:00 - 22:00
        if end_candidate.date() > start_candidate.date() or start_candidate.hour >= 21:
            rule_start_time = datetime.strptime("08:00:00", "%H:%M:%S").time()
            rule_end_time = datetime.strptime("22:00:00", "%H:%M:%S").time()
        else:
            rule_start_time = start_candidate.time()
            rule_end_time = end_candidate.time()

        for wkday in [today_weekday, tomorrow_weekday]:
            AvailabilityRule.objects.update_or_create(
                doctor=doc_profile,
                weekday=wkday,
                defaults={
                    "start_time": rule_start_time,
                    "end_time": rule_end_time,
                    "slot_duration": 15,
                    "is_active": True,
                },
            )

        # 6. Idempotent Confirmed Appointment (Starts in 2 mins)
        booking_code = "LAN-VIDEO-1"
        appt_start = now_local + timedelta(minutes=2)
        appt_end = appt_start + timedelta(minutes=15)

        # Clean any prior appointment with this booking code
        Appointment.objects.filter(booking_code=booking_code).delete()

        appt = Appointment.objects.create(
            doctor=doc_profile,
            patient=patient_user,
            start_time=appt_start,
            end_time=appt_end,
            fee_at_booking=doc_profile.consultation_fee,
            status=Appointment.Status.CONFIRMED,
            booking_code=booking_code,
            symptoms="Mild chest discomfort and palpitations for live LAN multi-device telehealth testing.",
        )

        # Notify
        try:
            NotificationService.notify_appointment_booked(appt)
        except Exception as e:
            logger.debug("Notification triggered with note: %s", e)

        # 7. Print Output
        self.stdout.write(
            self.style.SUCCESS(
                f"\n======================================================\n"
                f"  SEHATSETU LOCAL WIFI (LAN) DEMO MODE READY\n"
                f"======================================================\n"
                f"Machine LAN IP Detected: {lan_ip}\n\n"
                f"1. Health Check URL:\n"
                f"   http://{lan_ip}:8000/api/v1/health/\n\n"
                f"2. Frontend Web App (Open on Laptop & Mobile Phone):\n"
                f"   http://{lan_ip}:5173\n\n"
                f"------------------------------------------------------\n"
                f"DEMO ACCOUNTS (Home Wi-Fi Testing):\n"
                f"  Doctor (Laptop):\n"
                f"    Phone:    {doc_phone}\n"
                f"    Password: Demo@1234\n"
                f"    Profile:  {doc_user.full_name} ({cardio_spec.name}, {doc_profile.city})\n\n"
                f"  Patient (Mobile Phone):\n"
                f"    Phone:    {patient_phone}\n"
                f"    Password: Demo@1234\n"
                f"    Name:     {patient_user.full_name}\n\n"
                f"LIVE VIDEO APPOINTMENT:\n"
                f"  Reference Code: {appt.booking_code}\n"
                f"  Status:         CONFIRMED (Ready to enter video room)\n"
                f"  Scheduled Time: {appt_start.strftime('%I:%M %p')} - {appt_end.strftime('%I:%M %p')}\n"
                f"======================================================\n"
            )
        )
