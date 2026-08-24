"""
WebSocket URL routing for consultations app.
"""

from django.urls import re_path
from .consumers import ConsultConsumer

websocket_urlpatterns = [
    re_path(r"^ws/consult/(?P<appointment_id>\w+)/?$", ConsultConsumer.as_asgi()),
]
