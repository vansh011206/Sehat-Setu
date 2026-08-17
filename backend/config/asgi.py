"""
ASGI config for SehatSetu project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # WebSocket routing can be added here
        # "websocket": AuthMiddlewareStack(
        #     URLRouter(
        #         ...
        #     )
        # ),
    }
)
