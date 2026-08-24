import { apiClient } from "../../api/client";

export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionCreatePayload {
  diagnosis: string;
  medicines: MedicineItem[];
  advice?: string;
  follow_up_in_days?: number | null;
}

export interface PrescriptionDetail {
  id: number;
  appointment: number;
  booking_code: string;
  doctor: {
    id: number;
    name: string;
    photo?: string | null;
    specialty: {
      id: number;
      name: string;
      slug: string;
      icon_name: string;
    };
    qualification?: string;
    city?: string;
    clinic_name?: string;
    registration_number?: string;
  };
  patient: {
    id: number;
    phone: string;
    email: string;
    full_name: string;
    role: string;
  };
  diagnosis: string;
  medicines: MedicineItem[];
  advice: string;
  follow_up_in_days?: number | null;
  verification_code: string;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionVerificationResult {
  valid: boolean;
  verification_code: string;
  doctor_name: string;
  doctor_registration: string;
  specialty: string;
  clinic_city: string;
  patient_name_masked: string;
  date: string;
  diagnosis: string;
  medicines_count: number;
  pdf_url?: string | null;
  message?: string;
}

export interface PrescriptionsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PrescriptionDetail[];
}

export const prescriptionsApi = {
  createAppointmentPrescription: async (
    appointmentId: number,
    payload: PrescriptionCreatePayload
  ): Promise<PrescriptionDetail> => {
    const res = await apiClient.post<PrescriptionDetail>(
      `/appointments/${appointmentId}/prescriptions/`,
      payload
    );
    return res.data;
  },

  getPrescriptionDetail: async (
    prescriptionId: number
  ): Promise<PrescriptionDetail> => {
    const res = await apiClient.get<PrescriptionDetail>(
      `/prescriptions/${prescriptionId}/`
    );
    return res.data;
  },

  getAppointmentPrescription: async (
    appointmentId: number
  ): Promise<PrescriptionDetail> => {
    const res = await apiClient.get<PrescriptionDetail>(
      `/appointments/${appointmentId}/prescription/`
    );
    return res.data;
  },

  verifyPrescription: async (
    code: string
  ): Promise<PrescriptionVerificationResult> => {
    const res = await apiClient.get<PrescriptionVerificationResult>(
      `/verify/${encodeURIComponent(code)}/`
    );
    return res.data;
  },

  getMyPrescriptions: async (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<PrescriptionsListResponse> => {
    const res = await apiClient.get<PrescriptionsListResponse>(
      `/my/prescriptions/`,
      { params }
    );
    return res.data;
  },

  getDoctorPrescriptions: async (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<PrescriptionsListResponse> => {
    const res = await apiClient.get<PrescriptionsListResponse>(
      `/doctors/me/prescriptions/`,
      { params }
    );
    return res.data;
  },
};
