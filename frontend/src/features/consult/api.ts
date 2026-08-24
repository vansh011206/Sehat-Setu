import { apiClient } from "../../api/client";

export interface JitsiConfig {
  domain: string;
  room_name: string;
  display_name: string;
  email: string;
  is_doctor: boolean;
  prejoin_page_enabled: boolean;
  start_with_audio_muted: boolean;
  start_with_video_muted: boolean;
}

export interface StartConsultResponse {
  session_id: number;
  room_name: string;
  status: "WAITING" | "ACTIVE" | "ENDED";
  started_at: string | null;
  jitsi_config: JitsiConfig;
}

export interface ConsultStatusResponse {
  session_id: number | null;
  room_name: string | null;
  status: "WAITING" | "ACTIVE" | "ENDED";
  started_at: string | null;
  ended_at: string | null;
  appointment_status: string;
  is_doctor: boolean;
  start_window_valid: boolean;
}

export interface ChatMessageSender {
  id: number;
  full_name: string;
  role: string;
  profile_picture?: string | null;
}

export interface ChatMessage {
  id: number;
  appointment: number;
  sender: ChatMessageSender;
  text: string;
  created_at: string;
}

export interface PresenceUser {
  id: number;
  name: string;
  role: string;
}

export const consultApi = {
  startConsult: async (appointmentId: number): Promise<StartConsultResponse> => {
    const res = await apiClient.post<StartConsultResponse>(
      `/appointments/${appointmentId}/consult/start/`
    );
    return res.data;
  },

  endConsult: async (
    appointmentId: number
  ): Promise<{ status: string; ended_at: string; appointment_status: string }> => {
    const res = await apiClient.post(
      `/appointments/${appointmentId}/consult/end/`
    );
    return res.data;
  },

  getConsultStatus: async (
    appointmentId: number
  ): Promise<ConsultStatusResponse> => {
    const res = await apiClient.get<ConsultStatusResponse>(
      `/appointments/${appointmentId}/consult/status/`
    );
    return res.data;
  },

  getMessages: async (appointmentId: number): Promise<ChatMessage[]> => {
    const res = await apiClient.get<ChatMessage[]>(
      `/appointments/${appointmentId}/messages/`
    );
    return res.data;
  },
};
