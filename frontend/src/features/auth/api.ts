/**
 * Auth API functions — used by React Query mutations and queries.
 */

import client from "../../api/client";
import type { AuthUser } from "../../stores/authStore";

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  role: "PATIENT" | "DOCTOR";
}

export interface LoginPayload {
  phone_or_email: string;
  password: string;
}

export interface DoctorProfilePayload {
  specialty_id?: number;
  qualification?: string;
  years_of_experience?: number;
  registration_number?: string;
  bio?: string;
  city?: string;
  consultation_fee?: number;
  clinic_name?: string;
  clinic_address?: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    client.post<AuthResponse>("/auth/register/", data).then((r) => r.data),

  login: (data: LoginPayload) =>
    client.post<AuthResponse>("/auth/login/", data).then((r) => r.data),

  logout: (refresh: string) =>
    client.post("/auth/logout/", { refresh }).then((r) => r.data),

  refresh: (refresh: string) =>
    client.post("/auth/refresh/", { refresh }).then((r) => r.data),

  getMe: () => client.get<AuthUser>("/auth/me/").then((r) => r.data),

  updateMe: (data: FormData | Partial<AuthUser>) =>
    client.patch<AuthUser>("/auth/me/", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    }).then((r) => r.data),

  changePassword: (data: { old_password: string; new_password: string }) =>
    client.post("/auth/change-password/", data).then((r) => r.data),

  updateDoctorProfile: (data: DoctorProfilePayload) =>
    client.put("/doctors/me/profile/", data).then((r) => r.data),

  getDoctorProfile: () =>
    client.get("/doctors/me/profile/").then((r) => r.data),
};
