"""
Serializers for Notifications in SehatSetu.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserMinimalSerializer(read_only=True)
    recipient_id = serializers.IntegerField(source="recipient.id", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "recipient_id",
            "type",
            "title",
            "message",
            "icon",
            "data",
            "is_read",
            "actor",
            "created_at",
        )
        read_only_fields = (
            "id",
            "actor",
            "created_at",
        )
