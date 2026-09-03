"""
Tests for Notifications App: unread counts, read-all, NotificationService helpers.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from tests.factories import UserFactory, AppointmentFactory


@pytest.mark.django_db
class TestNotificationsAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_unread_count_and_list_endpoints(self):
        patient = UserFactory()
        Notification.objects.create(
            recipient=patient,
            title="Appointment Confirmed",
            message="Your appointment is confirmed.",
            type=Notification.Type.APPOINTMENT_CONFIRMED,
        )
        Notification.objects.create(
            recipient=patient,
            title="Reminder",
            message="15 minutes away",
            type=Notification.Type.APPOINTMENT_REMINDER,
        )

        self.client.force_authenticate(user=patient)

        # 1. Unread count endpoint
        count_url = reverse("notifications:notification-unread-count")
        res_count = self.client.get(count_url)
        assert res_count.status_code == status.HTTP_200_OK
        assert res_count.data["unread_count"] == 2

        # 2. List notifications endpoint
        list_url = reverse("notifications:notification-list")
        res_list = self.client.get(list_url)
        assert res_list.status_code == status.HTTP_200_OK
        assert res_list.data["count"] == 2

    def test_mark_all_read_endpoint(self):
        patient = UserFactory()
        Notification.objects.create(
            recipient=patient,
            title="Alert 1",
            message="Test message 1",
            type=Notification.Type.SYSTEM,
        )
        Notification.objects.create(
            recipient=patient,
            title="Alert 2",
            message="Test message 2",
            type=Notification.Type.SYSTEM,
        )

        self.client.force_authenticate(user=patient)
        read_all_url = reverse("notifications:notification-mark-all-read")
        res = self.client.post(read_all_url)
        assert res.status_code == status.HTTP_200_OK

        unread_remaining = Notification.objects.filter(
            recipient=patient, is_read=False
        ).count()
        assert unread_remaining == 0

    def test_notification_service_triggers(self):
        appt = AppointmentFactory()
        NotificationService.notify_appointment_booked(appt)
        assert Notification.objects.filter(recipient=appt.doctor.user).exists()
        assert Notification.objects.filter(recipient=appt.patient).exists()
