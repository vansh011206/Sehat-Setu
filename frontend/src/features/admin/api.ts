import { apiClient } from "../../api/client";

export interface OverviewStats {
  range: string;
  total_revenue: string | number;
  revenue_growth_pct: number;
  total_appointments: number;
  appointments_growth_pct: number;
  completed_count: number;
  cancelled_count: number;
  missed_count: number;
  active_doctors: number;
  doctors_growth_pct: number;
  active_patients: number;
  patients_growth_pct: number;
  new_users_this_period: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  bookings: number;
  completed: number;
}

export interface AppointmentStatusDistribution {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopDoctorStat {
  id: number;
  name: string;
  photo: string | null;
  specialty: string;
  city: string;
  revenue: number;
  completed_count: number;
  total_count: number;
  completion_rate: number;
  avg_rating: number;
}

export interface SpecialtyDemandStat {
  id: number;
  name: string;
  bookings_count: number;
  revenue: number;
  doctor_count: number;
}

export interface AdminDoctorItem {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  email: string;
  specialty: string;
  qualification: string;
  city: string;
  fee: number;
  avg_rating: number;
  rating_count: number;
  is_available: boolean;
  is_active: boolean;
  appointments_count: number;
  joined: string;
}

export interface AdminPatientItem {
  id: number;
  name: string;
  phone: string;
  email: string;
  appointments_count: number;
  total_spent: number;
  is_active: boolean;
  joined: string;
  last_appointment_date: string | null;
}

export interface PatientAppointmentHistory {
  id: number;
  booking_code: string;
  doctor_name: string;
  specialty: string;
  status: string;
  fee: number;
  date: string;
  symptoms: string;
}

export interface AdminAppointmentItem {
  id: number;
  booking_code: string;
  doctor: {
    id: number;
    name: string;
    specialty: string;
  };
  patient: {
    id: number;
    name: string;
    phone: string;
    email: string;
  };
  status: string;
  fee: number;
  start_time: string;
  end_time: string;
  symptoms: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  actor: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  target_model: string;
  target_id: string;
  description: string;
  changes: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const adminApi = {
  getOverviewStats: async (range: "7d" | "30d" | "90d" = "30d"): Promise<OverviewStats> => {
    const res = await apiClient.get<OverviewStats>("/admin/stats/overview/", {
      params: { range },
    });
    return res.data;
  },

  getRevenueTrend: async (range: "7d" | "30d" | "90d" = "30d"): Promise<RevenueTrendPoint[]> => {
    const res = await apiClient.get<RevenueTrendPoint[]>("/admin/stats/revenue-trend/", {
      params: { range },
    });
    return res.data;
  },

  getAppointmentsByStatus: async (): Promise<AppointmentStatusDistribution[]> => {
    const res = await apiClient.get<AppointmentStatusDistribution[]>(
      "/admin/stats/appointments-by-status/"
    );
    return res.data;
  },

  getTopDoctors: async (range: "7d" | "30d" | "90d" = "30d"): Promise<TopDoctorStat[]> => {
    const res = await apiClient.get<TopDoctorStat[]>("/admin/stats/top-doctors/", {
      params: { range },
    });
    return res.data;
  },

  getSpecialtyDemand: async (): Promise<SpecialtyDemandStat[]> => {
    const res = await apiClient.get<SpecialtyDemandStat[]>("/admin/stats/specialty-demand/");
    return res.data;
  },

  getDoctors: async (params?: {
    search?: string;
    specialty?: number | string;
    city?: string;
    is_available?: boolean | string;
    is_active?: boolean | string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AdminDoctorItem>> => {
    const res = await apiClient.get<PaginatedResponse<AdminDoctorItem>>("/admin/doctors/", {
      params,
    });
    return res.data;
  },

  updateDoctor: async (
    id: number,
    data: { is_available?: boolean; is_active?: boolean }
  ): Promise<{ success: boolean; changes: any }> => {
    const res = await apiClient.patch<{ success: boolean; changes: any }>(
      `/admin/doctors/${id}/`,
      data
    );
    return res.data;
  },

  deleteDoctor: async (id: number): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/admin/doctors/${id}/`);
    return res.data;
  },

  getPatients: async (params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AdminPatientItem>> => {
    const res = await apiClient.get<PaginatedResponse<AdminPatientItem>>("/admin/patients/", {
      params,
    });
    return res.data;
  },

  getPatientAppointments: async (patientId: number): Promise<PatientAppointmentHistory[]> => {
    const res = await apiClient.get<PatientAppointmentHistory[]>(
      `/admin/patients/${patientId}/appointments/`
    );
    return res.data;
  },

  getAppointments: async (params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AdminAppointmentItem>> => {
    const res = await apiClient.get<PaginatedResponse<AdminAppointmentItem>>(
      "/admin/appointments/",
      { params }
    );
    return res.data;
  },

  overrideAppointmentStatus: async (
    id: number,
    data: { status: string; audit_note: string }
  ): Promise<{ success: boolean; booking_code: string; new_status: string }> => {
    const res = await apiClient.patch<{
      success: boolean;
      booking_code: string;
      new_status: string;
    }>(`/admin/appointments/${id}/`, data);
    return res.data;
  },

  getAuditLogs: async (params?: {
    action?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AuditLogItem>> => {
    const res = await apiClient.get<PaginatedResponse<AuditLogItem>>("/admin/audit-logs/", {
      params,
    });
    return res.data;
  },
};
