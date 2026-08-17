"""
Views for Notifications.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    List notifications for authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    """
    Mark a notification or all notifications as read.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            try:
                notif = Notification.objects.get(id=pk, user=request.user)
                notif.is_read = True
                notif.save()
                return Response({"message": "Notification marked as read."})
            except Notification.DoesNotExist:
                return Response(
                    {"error": "Notification not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            Notification.objects.filter(user=request.user, is_read=False).update(
                is_read=True
            )
            return Response({"message": "All notifications marked as read."})
