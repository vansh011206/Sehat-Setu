import { apiClient } from "../../api/client";

export interface Specialty {
  id: number;
  name: string;
  slug: string;
  icon_name: string;
  description?: string;
  doctor_count: number;
}

export interface DoctorListItem {
  id: number;
  name: string;
  photo?: string | null;
  specialty: Specialty;
  qualification: string;
  city: string;
  clinic_name: string;
  fee: number | string;
  avg_rating: number | string;
  rating_count: number;
  experience: number;
  is_available: boolean;
}

export interface ReviewItem {
  id: number;
  patient_id: number;
  patient_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export interface DoctorDetail extends DoctorListItem {
  phone?: string;
  email?: string;
  registration_number: string;
  bio: string;
  clinic_address: string;
  recent_reviews: ReviewItem[];
  star_distribution: Record<number, number>;
  created_at: string;
  updated_at: string;
}

export interface DoctorFilterParams {
  search?: string;
  specialty?: string;
  city?: string;
  min_rating?: number;
  max_fee?: number;
  sort?: "rating" | "fee_asc" | "fee_desc" | "experience";
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  booked: boolean;
  is_past: boolean;
}

export interface DayAvailability {
  date: string;
  day_of_week: number;
  day_name: string;
  slots: AvailabilitySlot[];
}

export interface AvailabilityRule {
  id?: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

export const doctorsApi = {
  getSpecialties: async (): Promise<Specialty[]> => {
    const res = await apiClient.get<Specialty[]>("/specialties/");
    return res.data;
  },

  getDoctors: async (
    params: DoctorFilterParams = {}
  ): Promise<PaginatedResponse<DoctorListItem>> => {
    const res = await apiClient.get<PaginatedResponse<DoctorListItem>>("/doctors/", {
      params,
    });
    return res.data;
  },

  getDoctorDetail: async (id: number): Promise<DoctorDetail> => {
    const res = await apiClient.get<DoctorDetail>(`/doctors/${id}/`);
    return res.data;
  },

  getDoctorReviews: async (
    id: number,
    page = 1
  ): Promise<PaginatedResponse<ReviewItem>> => {
    const res = await apiClient.get<PaginatedResponse<ReviewItem>>(
      `/doctors/${id}/reviews/`,
      { params: { page } }
    );
    return res.data;
  },

  submitReview: async (
    id: number,
    data: { rating: number; review_text?: string }
  ): Promise<ReviewItem> => {
    const res = await apiClient.post<ReviewItem>(`/doctors/${id}/reviews/`, data);
    return res.data;
  },

  getAvailability: async (id: number): Promise<DayAvailability[]> => {
    const res = await apiClient.get<DayAvailability[]>(`/doctors/${id}/availability/`);
    return res.data;
  },

  getAvailabilityRules: async (id: number): Promise<AvailabilityRule[]> => {
    const res = await apiClient.get<AvailabilityRule[]>(`/doctors/${id}/availability/`, {
      params: { rules: "true" },
    });
    return res.data;
  },

  updateAvailability: async (
    id: number,
    rules: AvailabilityRule[]
  ): Promise<AvailabilityRule[]> => {
    const res = await apiClient.post<AvailabilityRule[]>(
      `/doctors/${id}/availability/`,
      rules
    );
    return res.data;
  },
};
