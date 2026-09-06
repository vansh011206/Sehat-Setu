import { apiClient } from "../../api/client";
import type { DoctorListItem, PaginatedResponse } from "../doctors/api";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED_BY_PATIENT"
  | "CANCELLED_BY_DOCTOR"
  | "MISSED";

export interface AppointmentPatient {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  role: string;
}

export interface Appointment {
  id: number;
  booking_code: string;
  doctor: DoctorListItem;
  patient: AppointmentPatient;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  cancellation_reason?: string;
  fee_at_booking: string | number;
  symptoms?: string;
  is_past?: boolean;
  patient_review?: {
    id: number;
    rating: number;
    review_text?: string;
    created_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface BookAppointmentPayload {
  doctor_id: number;
  start_time: string;
  symptoms?: string;
}

export interface AppointmentFilterParams {
  status?: string;
  upcoming?: "true" | "false";
  date?: string;
  page?: number;
  page_size?: number;
}

export const bookingsApi = {
  bookAppointment: async (payload: BookAppointmentPayload): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>("/appointments/", payload);
    return res.data;
  },

  getAppointments: async (
    params: AppointmentFilterParams = {}
  ): Promise<PaginatedResponse<Appointment>> => {
    const res = await apiClient.get<PaginatedResponse<Appointment>>("/appointments/", {
      params,
    });
    return res.data;
  },

  getAppointmentDetail: async (id: number): Promise<Appointment> => {
    const res = await apiClient.get<Appointment>(`/appointments/${id}/`);
    return res.data;
  },

  cancelAppointment: async (
    id: number,
    reason: string
  ): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>(`/appointments/${id}/cancel/`, {
      reason,
    });
    return res.data;
  },

  confirmAppointment: async (id: number): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>(`/appointments/${id}/confirm/`);
    return res.data;
  },

  completeAppointment: async (id: number): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>(`/appointments/${id}/complete/`);
    return res.data;
  },
};
