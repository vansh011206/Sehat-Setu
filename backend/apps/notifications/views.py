"""
Views for Notification listing, unread counts, and status marking.
"""

from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import Notification
from .serializers import NotificationSerializer


class StandardNotificationPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 50


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/
    List user notifications with optional unread_only filter and pagination.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = StandardNotificationPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="unread_only",
                type=bool,
                description="Filter to unread notifications only",
                required=False,
            ),
            OpenApiParameter(
                name="type",
                type=str,
                description="Filter by notification type",
                required=False,
            ),
        ]
    )
    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user).select_related("actor").order_by("-created_at")

        unread_only = self.request.query_params.get("unread_only")
        if unread_only and unread_only.lower() in ("true", "1", "yes"):
            qs = qs.filter(is_read=False)

        notif_type = self.request.query_params.get("type")
        if notif_type:
            qs = qs.filter(type=notif_type)

        return qs


class NotificationUnreadCountView(APIView):
    """
    GET /api/v1/notifications/unread-count/
    Returns the current count of unread notifications for the bell dot badge.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class MarkNotificationReadView(APIView):
    """
    POST /api/v1/notifications/read/{id}/
    Mark a single notification as read.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        updated = Notification.objects.filter(
            pk=pk, recipient=request.user
        ).update(is_read=True)

        if not updated:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        unread_count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response(
            {"success": True, "unread_count": unread_count},
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(APIView):
    """
    POST /api/v1/notifications/read-all/
    Mark all notifications of the authenticated user as read.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True
        )
        return Response(
            {"success": True, "unread_count": 0},
            status=status.HTTP_200_OK,
        )
