"""
WebSocket Consumer for Real-Time User Notifications & Badge Count Updates.
"""

import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer connected at /ws/notifications/?token=<jwt_access_token>
    Pushes real-time notification alerts, toast triggers, and bell badge counts.
    """

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if not token:
            logger.warning("Notification WebSocket rejected: No JWT token provided.")
            await self.close(code=4001)
            return

        user = await self.get_user_from_token(token)
        if not user:
            logger.warning("Notification WebSocket rejected: Invalid JWT token.")
            await self.close(code=4001)
            return

        self.user = user
        self.user_group_name = f"user_{user.id}"

        # Join personal user group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name,
        )

        await self.accept()

        # Send initial unread count and latest notifications
        initial_data = await self.get_initial_notifications()
        await self.send_json({
            "type": "initial_state",
            "unread_count": initial_data["unread_count"],
            "notifications": initial_data["notifications"],
        })

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name,
            )

    async def receive_json(self, content):
        action = content.get("action")
        if action == "mark_read":
            notification_id = content.get("notification_id")
            if notification_id:
                unread_count = await self.mark_notification_read(notification_id)
                await self.send_json({
                    "type": "unread_count_update",
                    "unread_count": unread_count,
                })
        elif action == "mark_all_read":
            await self.mark_all_notifications_read()
            await self.send_json({
                "type": "unread_count_update",
                "unread_count": 0,
            })

    async def notification_message(self, event):
        """
        Handler for messages pushed to the user's channel layer group.
        """
        await self.send_json({
            "type": "new_notification",
            "notification": event["notification"],
            "unread_count": event["unread_count"],
        })

    # ─── Database Helpers ───

    @database_sync_to_async
    def get_user_from_token(self, token_str: str):
        try:
            access_token = AccessToken(token_str)
            user_id = access_token.get("user_id")
            return User.objects.filter(id=user_id, is_active=True).first()
        except (InvalidToken, TokenError, Exception) as exc:
            logger.debug(f"JWT auth error in NotificationConsumer: {exc}")
            return None

    @database_sync_to_async
    def get_initial_notifications(self):
        qs = Notification.objects.filter(recipient=self.user).order_by("-created_at")[:15]
        unread_count = Notification.objects.filter(recipient=self.user, is_read=False).count()
        return {
            "unread_count": unread_count,
            "notifications": NotificationSerializer(qs, many=True).data,
        }

    @database_sync_to_async
    def mark_notification_read(self, notification_id: int) -> int:
        Notification.objects.filter(id=notification_id, recipient=self.user).update(is_read=True)
        return Notification.objects.filter(recipient=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_all_notifications_read(self):
        Notification.objects.filter(recipient=self.user, is_read=False).update(is_read=True)
