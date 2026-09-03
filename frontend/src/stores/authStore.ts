/**
 * Zustand auth store.
 * Persists tokens to localStorage; API layer reads them via interceptor.
 */

import { create } from "zustand";

export interface AuthUser {
  id: number;
  phone: string;
  full_name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  profile_picture: string;
  gender: string;
  date_of_birth: string | null;
  date_joined: string;
  doctor_profile?: {
    id: number;
    specialty?: any;
    qualification?: string;
    city?: string;
    fee?: string | number;
    avg_rating?: string | number;
    rating_count?: number;
    is_available?: boolean;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const getInitialUser = (): AuthUser | null => {
    try {
      const item = localStorage.getItem("user");
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const initialUser = getInitialUser();
  const initialAccessToken = localStorage.getItem("access_token");
  const initialRefreshToken = localStorage.getItem("refresh_token");

  return {
    user: initialUser,
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    isAuthenticated: Boolean(initialAccessToken && initialUser),

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    },

    clearAuth: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      try {
        window.dispatchEvent(new Event("sehatsetu:logout"));
      } catch {}
    },

    updateUser: (updates) => {
      const current = get().user;
      if (current) {
        const updated = { ...current, ...updates };
        localStorage.setItem("user", JSON.stringify(updated));
        set({ user: updated });
      }
    },
  };
});

