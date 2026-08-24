import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import type { NotificationItem } from "./api";

export function useNotificationsWebSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const host = window.location.hostname || "localhost";
    const port = 8000;
    const wsUrl = `ws://${host}:${port}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "initial_state") {
            setUnreadCount(data.unread_count || 0);
            queryClient.setQueryData(["notifications-unread-count"], {
              unread_count: data.unread_count || 0,
            });
          } else if (data.type === "new_notification") {
            const notif: NotificationItem = data.notification;
            const newCount = data.unread_count;

            setUnreadCount(newCount);
            queryClient.setQueryData(["notifications-unread-count"], {
              unread_count: newCount,
            });

            // Update notifications lists in React Query cache
            queryClient.setQueriesData(
              { queryKey: ["notifications-list"] },
              (oldData: any) => {
                if (!oldData || !oldData.results) return oldData;
                return {
                  ...oldData,
                  count: (oldData.count || 0) + 1,
                  results: [notif, ...oldData.results],
                };
              }
            );

            // In-App Toast trigger for real-time alert
            toast({
              title: notif.title,
              description: notif.message,
              variant: notif.type === "APPOINTMENT_CANCELLED" ? "danger" : "info",
            });
          } else if (data.type === "unread_count_update") {
            setUnreadCount(data.unread_count || 0);
            queryClient.setQueryData(["notifications-unread-count"], {
              unread_count: data.unread_count || 0,
            });
          }
        } catch (e) {
          console.error("Failed to parse notification WebSocket message", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 4s if still authenticated
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 4000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("Notification WebSocket creation failed", e);
    }
  }, [isAuthenticated, accessToken, queryClient, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const markReadViaWs = useCallback((notificationId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "mark_read",
          notification_id: notificationId,
        })
      );
    }
  }, []);

  const markAllReadViaWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "mark_all_read",
        })
      );
    }
  }, []);

  return {
    unreadCount,
    isConnected,
    markReadViaWs,
    markAllReadViaWs,
  };
}
