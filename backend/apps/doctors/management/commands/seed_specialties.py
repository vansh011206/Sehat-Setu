"""
Management command to seed standard medical specialties.
"""

from django.core.management.base import BaseCommand
from apps.doctors.models import Specialty


class Command(BaseCommand):
    help = "Seed standard medical specialties with lucide icon mappings"

    def handle(self, *args, **options):
        specialties_data = [
            {
                "name": "General Medicine",
                "slug": "general-medicine",
                "icon_name": "stethoscope",
                "description": "Comprehensive primary care, fever, diabetes, blood pressure, and preventive wellness.",
            },
            {
                "name": "Cardiology",
                "slug": "cardiology",
                "icon_name": "heart-pulse",
                "description": "Heart disease, hypertension, cholesterol management, and cardiovascular rehabilitation.",
            },
            {
                "name": "Dermatology",
                "slug": "dermatology",
                "icon_name": "sparkles",
                "description": "Skin health, acne, eczema, hair loss, allergies, and cosmetic procedures.",
            },
            {
                "name": "Pediatrics",
                "slug": "pediatrics",
                "icon_name": "baby",
                "description": "Infant care, child growth monitoring, vaccinations, and pediatric illnesses.",
            },
            {
                "name": "Orthopedics",
                "slug": "orthopedics",
                "icon_name": "bone",
                "description": "Bone fractures, joint pain, arthritis, spine health, and sports injuries.",
            },
            {
                "name": "Neurology",
                "slug": "neurology",
                "icon_name": "brain",
                "description": "Migraines, epilepsy, nerve disorders, stroke recovery, and memory care.",
            },
            {
                "name": "Gynecology",
                "slug": "gynecology",
                "icon_name": "heart-handshake",
                "description": "Women's reproductive health, prenatal care, PCOS, and maternity guidance.",
            },
            {
                "name": "ENT Specialist",
                "slug": "ent",
                "icon_name": "ear",
                "description": "Ear infections, hearing issues, sinus conditions, throat and voice care.",
            },
        ]

        count = 0
        for item in specialties_data:
            obj, created = Specialty.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["name"],
                    "icon_name": item["icon_name"],
                    "description": item["description"],
                    "is_active": True,
                },
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {obj.name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated: {obj.name}"))

        self.stdout.write(
            self.style.SUCCESS(f"Successfully processed {len(specialties_data)} specialties ({count} newly created).")
        )
