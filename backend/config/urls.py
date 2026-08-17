"""
URL configuration for SehatSetu project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from apps.doctors.views import SpecialtyListView


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify backend service status.
    """
    return Response(
        {
            "status": "healthy",
            "service": "SehatSetu Backend API",
            "version": "1.0.0",
            "timestamp": timezone.now().isoformat(),
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    # Health endpoint
    path("api/v1/health/", health_check, name="health-check"),
    # Direct Specialties alias
    path("api/v1/specialties/", SpecialtyListView.as_view(), name="top-specialties-list"),
    # API endpoints
    path("api/v1/auth/", include("apps.accounts.urls", namespace="accounts")),
    path("api/v1/doctors/", include("apps.doctors.urls", namespace="doctors")),
    path(
        "api/v1/appointments/",
        include("apps.appointments.urls", namespace="appointments"),
    ),
    path(
        "api/v1/consultations/",
        include("apps.consultations.urls", namespace="consultations"),
    ),
    path(
        "api/v1/prescriptions/",
        include("apps.prescriptions.urls", namespace="prescriptions"),
    ),
    path(
        "api/v1/notifications/",
        include("apps.notifications.urls", namespace="notifications"),
    ),
    # API Schema & Documentation
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
