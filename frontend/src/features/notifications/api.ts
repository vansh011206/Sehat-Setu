import { apiClient } from "../../api/client";

export interface NotificationItem {
  id: number;
  type:
    | "APPOINTMENT_CONFIRMED"
    | "APPOINTMENT_CANCELLED"
    | "APPOINTMENT_REMINDER"
    | "CONSULT_STARTED"
    | "NEW_PRESCRIPTION"
    | "REVIEW_RECEIVED"
    | "PROFILE_INCOMPLETE"
    | "SYSTEM";
  title: string;
  message: string;
  icon: string;
  data: Record<string, any>;
  is_read: boolean;
  actor?: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
    role: string;
  } | null;
  created_at: string;
}

export interface NotificationsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const notificationsApi = {
  getNotifications: async (params?: {
    unread_only?: boolean;
    type?: string;
    page?: number;
    page_size?: number;
  }): Promise<NotificationsListResponse> => {
    const res = await apiClient.get<NotificationsListResponse>(
      "/notifications/",
      { params }
    );
    return res.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const res = await apiClient.get<UnreadCountResponse>(
      "/notifications/unread-count/"
    );
    return res.data;
  },

  markAsRead: async (id: number): Promise<{ success: boolean; unread_count: number }> => {
    const res = await apiClient.post<{ success: boolean; unread_count: number }>(
      `/notifications/read/${id}/`
    );
    return res.data;
  },

  markAllAsRead: async (): Promise<{ success: boolean; unread_count: number }> => {
    const res = await apiClient.post<{ success: boolean; unread_count: number }>(
      "/notifications/read-all/"
    );
    return res.data;
  },
};
