"""
WebSocket Consumer for Telehealth Consultations (Presence, Chat, and Session Status).
"""

import time
from urllib.parse import parse_qs
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User
from apps.appointments.models import Appointment
from .models import ConsultMessage, ConsultSession

# In-memory presence tracker: room_id -> set of (user_id, name, role)
_ROOM_PRESENCE: dict[int, dict[int, dict]] = {}


class ConsultConsumer(AsyncJsonWebsocketConsumer):
    """
    Handles real-time WebRTC room signaling, chat messaging, typing indicators,
    and presence tracking for an active consultation appointment.
    """

    async def connect(self):
        self.appointment_id = self.scope["url_route"]["kwargs"].get("appointment_id")
        self.room_group_name = f"consult_{self.appointment_id}"
        self.msg_timestamps: list[float] = []
        self.last_typing_time: float = 0

        # 1. Extract and validate JWT from query string
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        parsed_params = parse_qs(query_string)
        token_list = parsed_params.get("token")

        if not token_list or not token_list[0]:
            await self.close(code=4004)
            return

        token_str = token_list[0]
        try:
            token = AccessToken(token_str)
            user_id = token["user_id"]
            self.user = await sync_to_async(User.objects.get)(id=user_id)
        except Exception:
            await self.close(code=4004)
            return

        # 2. Check appointment existence and user membership
        try:
            self.appointment = await sync_to_async(
                Appointment.objects.select_related(
                    "doctor", "doctor__user", "patient"
                ).get
            )(id=self.appointment_id)
        except Appointment.DoesNotExist:
            await self.close(code=4004)
            return

        # Verify caller is patient, doctor, or admin using sync_to_async
        def _is_member(u, apt):
            if u.id == apt.patient_id:
                return True
            if u.role == User.Role.DOCTOR and hasattr(u, "doctor_profile"):
                return apt.doctor_id == u.doctor_profile.id
            if u.role == User.Role.ADMIN:
                return True
            return False

        is_allowed = await sync_to_async(_is_member)(self.user, self.appointment)
        if not is_allowed:
            await self.close(code=4004)
            return

        # 3. Accept WebSocket connection
        await self.accept()

        # 4. Join channel group
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )

        # 5. Track presence
        if self.appointment_id not in _ROOM_PRESENCE:
            _ROOM_PRESENCE[self.appointment_id] = {}

        _ROOM_PRESENCE[self.appointment_id][self.user.id] = {
            "id": self.user.id,
            "name": self.user.full_name,
            "role": self.user.role,
        }

        # Broadcast join & current presence
        presence_list = list(_ROOM_PRESENCE[self.appointment_id].values())
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_event",
                "event": "join",
                "user": {
                    "id": self.user.id,
                    "name": self.user.full_name,
                    "role": self.user.role,
                },
                "presence": presence_list,
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name") and hasattr(self, "user"):
            # Remove from presence
            if (
                self.appointment_id in _ROOM_PRESENCE
                and self.user.id in _ROOM_PRESENCE[self.appointment_id]
            ):
                del _ROOM_PRESENCE[self.appointment_id][self.user.id]
                if not _ROOM_PRESENCE[self.appointment_id]:
                    del _ROOM_PRESENCE[self.appointment_id]

            presence_list = (
                list(_ROOM_PRESENCE[self.appointment_id].values())
                if self.appointment_id in _ROOM_PRESENCE
                else []
            )

            # Broadcast leave event
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_event",
                    "event": "leave",
                    "user": {
                        "id": self.user.id,
                        "name": self.user.full_name,
                        "role": self.user.role,
                    },
                    "presence": presence_list,
                },
            )

            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive_json(self, content):
        msg_type = content.get("type")
        now = time.time()

        if msg_type == "message":
            text = (content.get("text") or "").strip()
            if not text:
                return

            # Rate limit check: max 10 messages per 10 seconds per user
            self.msg_timestamps = [
                t for t in self.msg_timestamps if now - t < 10.0
            ]
            if len(self.msg_timestamps) >= 10:
                await self.send_json(
                    {
                        "type": "error",
                        "message": "Rate limit exceeded. Maximum 10 messages per 10 seconds.",
                    }
                )
                return

            self.msg_timestamps.append(now)

            # Persist message to database
            msg = await sync_to_async(ConsultMessage.objects.create)(
                appointment=self.appointment,
                sender=self.user,
                text=text[:2000],
            )

            # Broadcast to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "id": msg.id,
                    "sender": {
                        "id": self.user.id,
                        "name": self.user.full_name,
                        "role": self.user.role,
                    },
                    "text": msg.text,
                    "sent_at": msg.created_at.isoformat(),
                },
            )

        elif msg_type == "typing":
            # 3-second throttle on typing broadcasts
            if now - self.last_typing_time >= 2.5:
                self.last_typing_time = now
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "typing_event",
                        "user": {
                            "id": self.user.id,
                            "name": self.user.full_name,
                            "role": self.user.role,
                        },
                    },
                )

        elif msg_type == "session":
            status_val = content.get("status")
            if status_val in ["WAITING", "ACTIVE", "ENDED"]:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "session_event",
                        "status": status_val,
                    },
                )

    # ── Group Send Event Handlers ──

    async def chat_message(self, event):
        await self.send_json(
            {
                "type": "message",
                "id": event["id"],
                "sender": event["sender"],
                "text": event["text"],
                "sent_at": event["sent_at"],
            }
        )

    async def typing_event(self, event):
        # Don't echo typing event back to the user who typed
        if event["user"]["id"] != self.user.id:
            await self.send_json(
                {
                    "type": "typing",
                    "user": event["user"],
                }
            )

    async def presence_event(self, event):
        await self.send_json(
            {
                "type": event["event"],
                "user": event["user"],
                "presence": event["presence"],
            }
        )

    async def session_event(self, event):
        await self.send_json(
            {
                "type": "session",
                "status": event["status"],
            }
        )
