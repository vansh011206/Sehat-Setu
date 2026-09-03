import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  notificationsApi,
  type NotificationItem,
} from "../api";
import { useNotificationsWebSocket } from "../useNotificationsWebSocket";
import { useAuthStore } from "../../../stores/authStore";
import {
  formatRelativeTime,
  getNotificationStyle,
  groupNotificationsByDay,
} from "../utils";

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time WebSocket hook
  const {
    unreadCount: wsUnreadCount,
    markReadViaWs,
    markAllReadViaWs,
  } = useNotificationsWebSocket();

  // Fetch notifications list
  const { data, isLoading } = useQuery({
    queryKey: ["notifications-list", user?.id],
    queryFn: () => notificationsApi.getNotifications({ page_size: 15 }),
    enabled: !!user?.id,
    refetchInterval: 30000, // Background fallback poll
  });

  // Fetch initial unread count
  const { data: countData } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user?.id,
    initialData: { unread_count: wsUnreadCount },
  });

  const unreadCount = countData?.unread_count ?? wsUnreadCount ?? 0;
  const notifications: NotificationItem[] = data?.results || [];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      markAllReadViaWs();
      queryClient.setQueryData(["notifications-unread-count"], { unread_count: 0 });
      queryClient.setQueriesData(
        { queryKey: ["notifications-list"] },
        (old: any) => {
          if (!old || !old.results) return old;
          return {
            ...old,
            results: old.results.map((n: NotificationItem) => ({
              ...n,
              is_read: true,
            })),
          };
        }
      );
    },
  });

  // Handle clicking a single notification
  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markReadViaWs(notif.id);
      notificationsApi.markAsRead(notif.id).catch(() => {});
      queryClient.setQueryData(["notifications-unread-count"], (old: any) => ({
        unread_count: Math.max(0, (old?.unread_count || 1) - 1),
      }));
      queryClient.setQueriesData(
        { queryKey: ["notifications-list"] },
        (old: any) => {
          if (!old || !old.results) return old;
          return {
            ...old,
            results: old.results.map((n: NotificationItem) =>
              n.id === notif.id ? { ...n, is_read: true } : n
            ),
          };
        }
      );
    }

    setIsOpen(false);

    // Resolve target link
    const targetLink = notif.data?.link;
    if (targetLink) {
      navigate(targetLink);
    } else if (notif.type === "CONSULT_STARTED" && notif.data?.appointment_id) {
      navigate(`/consult/${notif.data.appointment_id}`);
    } else if (notif.type === "NEW_PRESCRIPTION") {
      navigate("/prescriptions");
    } else if (
      notif.type === "APPOINTMENT_CONFIRMED" ||
      notif.type === "APPOINTMENT_REMINDER" ||
      notif.type === "APPOINTMENT_CANCELLED"
    ) {
      navigate("/appointments");
    }
  };

  const grouped = groupNotificationsByDay(notifications);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* ─── Notification Bell Button ─── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-ink hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs animate-pulse ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Notification Dropdown Panel ─── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden animate-fadeIn flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-heading text-ink">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-muted text-xs flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-teal-700" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length > 0 ? (
              Object.entries(grouped).map(([groupTitle, items]) => {
                if (items.length === 0) return null;

                return (
                  <div key={groupTitle}>
                    <div className="px-4 py-1.5 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {groupTitle}
                    </div>

                    <div className="divide-y divide-slate-50">
                      {items.map((item) => {
                        const style = getNotificationStyle(item.type, item.icon);
                        const IconComponent = style.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                              !item.is_read
                                ? "bg-teal-50/30 border-l-3 border-teal-700 font-medium"
                                : "text-slate-600"
                            }`}
                          >
                            {/* Type Icon */}
                            <div
                              className={`w-8 h-8 rounded-xl ${style.bgColor} ${style.textColor} border ${style.borderColor} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                            >
                              <IconComponent size={15} />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-start justify-between gap-1">
                                <h4
                                  className={`text-xs ${
                                    !item.is_read
                                      ? "font-bold text-ink"
                                      : "font-semibold text-slate-800"
                                  } truncate`}
                                >
                                  {item.title}
                                </h4>
                                <span className="text-[10px] text-muted shrink-0 tabular-nums">
                                  {formatRelativeTime(item.created_at)}
                                </span>
                              </div>

                              <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                                {item.message}
                              </p>
                            </div>

                            {/* Unread indicator dot */}
                            {!item.is_read && (
                              <div className="w-2 h-2 rounded-full bg-teal-700 shrink-0 self-center" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell size={18} />
                </div>
                <h4 className="text-xs font-bold text-ink">You're all caught up!</h4>
                <p className="text-[11px] text-muted max-w-xs mx-auto">
                  No new notifications right now. Alerts for upcoming appointments and prescriptions will show here.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border bg-slate-50/80 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 py-1"
            >
              <span>View all notifications</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
