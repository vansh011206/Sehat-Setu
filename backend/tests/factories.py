"""
FactoryBoy factories for generating test data in SehatSetu backend tests.
"""

from datetime import timedelta
from decimal import Decimal
import factory
from django.utils import timezone
from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilityRule
from apps.doctors.models import DoctorProfile, Review, Specialty
from apps.prescriptions.models import Prescription


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    phone = factory.Sequence(lambda n: f"+9198000{n:05d}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    full_name = factory.Faker("name")
    role = User.Role.PATIENT
    is_active = True

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        pw = extracted or "TestPassword123"
        obj.set_password(pw)
        if create:
            obj.save()


class DoctorUserFactory(UserFactory):
    role = User.Role.DOCTOR


class AdminUserFactory(UserFactory):
    role = User.Role.ADMIN
    is_staff = True


class SpecialtyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Specialty

    name = factory.Sequence(lambda n: f"Specialty_{n}")
    description = "Test specialty description"
    icon_name = "stethoscope"


class DoctorProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DoctorProfile

    user = factory.SubFactory(DoctorUserFactory)
    specialty = factory.SubFactory(SpecialtyFactory)
    qualification = "MBBS, MD"
    years_of_experience = 8
    registration_number = factory.Sequence(lambda n: f"REG-{n:06d}")
    city = "New Delhi"
    consultation_fee = Decimal("500.00")
    is_available = True


class AvailabilityRuleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AvailabilityRule

    doctor = factory.SubFactory(DoctorProfileFactory)
    weekday = 1
    start_time = "09:00:00"
    end_time = "17:00:00"
    slot_duration = 30


class AppointmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Appointment

    doctor = factory.SubFactory(DoctorProfileFactory)
    patient = factory.SubFactory(UserFactory)
    start_time = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1))
    end_time = factory.LazyAttribute(lambda o: o.start_time + timedelta(minutes=30))
    fee_at_booking = Decimal("500.00")
    status = Appointment.Status.CONFIRMED
    symptoms = "Regular checkup"


class PrescriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Prescription

    appointment = factory.SubFactory(AppointmentFactory)
    doctor = factory.LazyAttribute(lambda o: o.appointment.doctor)
    patient = factory.LazyAttribute(lambda o: o.appointment.patient)
    medicines = factory.LazyFunction(
        lambda: [
            {
                "name": "Paracetamol",
                "dosage": "500 mg",
                "frequency": "Twice daily",
                "duration": "5 Days",
                "instructions": "After meals",
            }
        ]
    )
    diagnosis = "Acute Viral Fever"
    advice = "Rest and hydration"
    follow_up_in_days = 7
