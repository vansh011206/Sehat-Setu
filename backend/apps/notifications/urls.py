"""
URL patterns for Notifications.
"""

from django.urls import path
from .views import MarkNotificationReadView, NotificationListView

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("read-all/", MarkNotificationReadView.as_view(), name="mark-all-read"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="mark-single-read"),
]
