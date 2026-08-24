"""
ASGI config for SehatSetu project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.consultations.routing import websocket_urlpatterns as consult_ws_patterns
from apps.notifications.routing import websocket_urlpatterns as notif_ws_patterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

all_ws_patterns = consult_ws_patterns + notif_ws_patterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(all_ws_patterns),
    }
)
