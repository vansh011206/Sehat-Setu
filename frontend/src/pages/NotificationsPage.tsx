import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import {
  notificationsApi,
  type NotificationItem,
} from "../features/notifications/api";
import { useNotificationsWebSocket } from "../features/notifications/useNotificationsWebSocket";
import {
  formatRelativeTime,
  getNotificationStyle,
} from "../features/notifications/utils";

const FILTER_OPTIONS = [
  { label: "All Notifications", value: "ALL" },
  { label: "Unread Only", value: "UNREAD" },
  { label: "Appointments", value: "APPOINTMENT" },
  { label: "Consultations", value: "CONSULT" },
  { label: "Prescriptions", value: "PRESCRIPTION" },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { markReadViaWs, markAllReadViaWs } = useNotificationsWebSocket();

  // Fetch notifications
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications-list-full", activeFilter],
    queryFn: () =>
      notificationsApi.getNotifications({
        unread_only: activeFilter === "UNREAD" ? true : undefined,
        type:
          activeFilter === "APPOINTMENT"
            ? "APPOINTMENT_CONFIRMED"
            : activeFilter === "CONSULT"
            ? "CONSULT_STARTED"
            : activeFilter === "PRESCRIPTION"
            ? "NEW_PRESCRIPTION"
            : undefined,
        page_size: 50,
      }),
  });

  const notifications = data?.results || [];

  // Filter with search query
  const filtered = notifications.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q)
    );
  });

  // Mark all read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      markAllReadViaWs();
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list-full"] });
    },
  });

  // Mark single read
  const handleMarkRead = (id: number) => {
    markReadViaWs(id);
    notificationsApi.markAsRead(id).catch(() => {});
    queryClient.setQueryData(["notifications-unread-count"], (old: any) => ({
      unread_count: Math.max(0, (old?.unread_count || 1) - 1),
    }));
    queryClient.setQueriesData(
      { queryKey: ["notifications-list-full"] },
      (old: any) => {
        if (!old || !old.results) return old;
        return {
          ...old,
          results: old.results.map((n: NotificationItem) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
        };
      }
    );
  };

  const handleActionNavigate = (notif: NotificationItem) => {
    handleMarkRead(notif.id);
    const link = notif.data?.link;
    if (link) {
      navigate(link);
    } else if (notif.type === "CONSULT_STARTED" && notif.data?.appointment_id) {
      navigate(`/consult/${notif.data.appointment_id}`);
    } else if (notif.type === "NEW_PRESCRIPTION") {
      navigate("/prescriptions");
    } else if (notif.type.startsWith("APPOINTMENT")) {
      navigate("/appointments");
    }
  };

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
        {/* ─── Header & Breadcrumbs ─── */}
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Notifications" },
            ]}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2">
                <Bell size={24} className="text-teal-700" />
                Notification Center
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Real-time updates on appointment bookings, live consultation rooms, and verified prescriptions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                loading={isRefetching}
                onClick={() => refetch()}
                className="text-xs"
              >
                Refresh
              </Button>
              {unreadTotal > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={CheckCheck}
                  loading={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs font-bold"
                >
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Search & Filter Chips Bar ─── */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full bg-slate-50 border border-border text-ink text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === f.value
                    ? "bg-teal-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Notifications List ─── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" variant="rect" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((item) => {
              const style = getNotificationStyle(item.type, item.icon);
              const IconComponent = style.icon;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !item.is_read
                      ? "border-teal-300 bg-teal-50/20 border-l-4 border-l-teal-700"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${style.bgColor} ${style.textColor} border ${style.borderColor} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <IconComponent size={18} />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm ${
                            !item.is_read ? "font-bold text-ink" : "font-semibold text-slate-800"
                          }`}
                        >
                          {item.title}
                        </h3>
                        {!item.is_read && (
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.2 rounded-full">
                            New
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          • {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!item.is_read && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                        title="Mark as Read"
                      >
                        <Check size={16} />
                      </button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionNavigate(item)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications found"
            description="You don't have any notifications matching this filter. System alerts and reminders will appear here in real-time."
          />
        )}
      </div>
    </AppLayout>
  );
}
