import { apiClient } from "../../api/client";
import type { Appointment } from "../bookings/api";
import type { DoctorListItem } from "../doctors/api";

export interface PatientDashboardStats {
  total_appointments: number;
  upcoming_appointment: Appointment | null;
  completed_count: number;
  cancelled_count: number;
  prescriptions_count: number;
}

export interface PatientDashboardData {
  stats: PatientDashboardStats;
  recent_appointments: Appointment[];
  recommended_doctors: DoctorListItem[];
}

export interface TodayAppointmentPatient {
  id: number;
  phone: string;
  email?: string;
  full_name: string;
  role: string;
  profile_picture?: string | null;
  gender?: string;
  date_of_birth?: string | null;
}

export interface DoctorTodayAppointment {
  id: number;
  booking_code: string;
  start_time: string;
  end_time: string;
  status: string;
  fee_at_booking: string | number;
  symptoms?: string;
  patient: TodayAppointmentPatient;
}

export interface MonthlyMetric {
  month: string;
  date_key: string;
  count: number;
  completed: number;
  revenue: string | number;
}

export interface ProfileChecklist {
  items: {
    qualification: boolean;
    registration_number: boolean;
    specialty: boolean;
    city: boolean;
    consultation_fee: boolean;
    bio: boolean;
    clinic_name: boolean;
    availability_configured: boolean;
  };
  percentage: number;
}

export interface DoctorDashboardData {
  timeframe?: string;
  timeframe_label?: string;
  today_schedule: DoctorTodayAppointment[];
  schedule?: DoctorTodayAppointment[];
  upcoming_7_days_count: number;
  completed_today_count: number;
  total_patients_served: number;
  avg_rating: string | number;
  rating_count: number;
  today_revenue: string | number;
  monthly_appointments: MonthlyMetric[];
  is_profile_complete: boolean;
  profile_completion_checklist: ProfileChecklist;
}

export interface PatientPastAppointment {
  id: number;
  booking_code: string;
  start_time: string;
  end_time: string;
  status: string;
  fee_at_booking: string | number;
  symptoms?: string;
}

export interface PatientPrescription {
  id: number;
  diagnosis: string;
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  notes?: string;
  created_at: string;
}

export interface DoctorPatientSummary {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  gender?: string;
  date_of_birth?: string | null;
  profile_picture?: string | null;
  total_visits: number;
  last_visit_date: string | null;
  last_status: string | null;
  past_appointments: PatientPastAppointment[];
  prescriptions: PatientPrescription[];
}

export const dashboardApi = {
  getPatientDashboard: async (): Promise<PatientDashboardData> => {
    const res = await apiClient.get<PatientDashboardData>("/dashboard/patient/");
    return res.data;
  },

  getDoctorDashboard: async (timeframe: string = "today"): Promise<DoctorDashboardData> => {
    const res = await apiClient.get<DoctorDashboardData>("/dashboard/doctor/", {
      params: { timeframe },
    });
    return res.data;
  },

  getDoctorPatients: async (doctorId: number): Promise<DoctorPatientSummary[]> => {
    const res = await apiClient.get<DoctorPatientSummary[]>(`/doctors/${doctorId}/patients/`);
    return res.data;
  },
};
