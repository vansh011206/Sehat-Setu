import {
  AlertCircle,
  Bell,
  CalendarCheck,
  CalendarX,
  Clock,
  FileText,
  Star,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { NotificationItem } from "./api";

/**
 * Custom zero-dependency relative time formatter (e.g. "Just now", "5m ago", "2h ago", "Yesterday", "12 Aug")
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) {
    return "Just now";
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Group notifications by day: "Today", "Yesterday", "Earlier"
 */
export function groupNotificationsByDay(
  notifications: NotificationItem[]
): Record<string, NotificationItem[]> {
  const groups: Record<string, NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  notifications.forEach((item) => {
    const itemDate = new Date(item.created_at);
    const itemDateStr = itemDate.toDateString();

    if (itemDateStr === todayStr) {
      groups["Today"].push(item);
    } else if (itemDateStr === yesterdayStr) {
      groups["Yesterday"].push(item);
    } else {
      groups["Earlier"].push(item);
    }
  });

  return groups;
}

export interface NotificationTypeStyle {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Maps notification type to Lucide icon and soft-tinted color scheme
 */
export function getNotificationStyle(
  type: string,
  _iconName?: string
): NotificationTypeStyle {
  switch (type) {
    case "CONSULT_STARTED":
      return {
        icon: Video,
        bgColor: "bg-teal-50",
        textColor: "text-teal-700",
        borderColor: "border-teal-200",
      };
    case "NEW_PRESCRIPTION":
      return {
        icon: FileText,
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
      };
    case "APPOINTMENT_CONFIRMED":
      return {
        icon: CalendarCheck,
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
      };
    case "APPOINTMENT_CANCELLED":
      return {
        icon: CalendarX,
        bgColor: "bg-rose-50",
        textColor: "text-rose-700",
        borderColor: "border-rose-200",
      };
    case "APPOINTMENT_REMINDER":
      return {
        icon: Clock,
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
      };
    case "REVIEW_RECEIVED":
      return {
        icon: Star,
        bgColor: "bg-amber-50",
        textColor: "text-amber-600",
        borderColor: "border-amber-200",
      };
    case "PROFILE_INCOMPLETE":
      return {
        icon: AlertCircle,
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
      };
    default:
      return {
        icon: Bell,
        bgColor: "bg-slate-50",
        textColor: "text-slate-700",
        borderColor: "border-slate-200",
      };
  }
}
