"""
URL patterns for Notifications.
"""

from django.urls import path
from .views import (
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationListView,
    NotificationUnreadCountView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("read/<int:pk>/", MarkNotificationReadView.as_view(), name="notification-mark-read-by-prefix"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="notification-mark-read"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="notification-mark-all-read"),
]
