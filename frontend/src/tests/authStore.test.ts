import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, type AuthUser } from "../stores/authStore";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("should initialize with unauthenticated state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should update state on successful login", () => {
    const mockUser: AuthUser = {
      id: 1,
      phone: "+919876543210",
      email: "admin@sehatsetu.com",
      full_name: "Admin User",
      role: "ADMIN",
      profile_picture: "",
      gender: "MALE",
      date_of_birth: null,
      date_joined: "2026-01-01",
    };
    useAuthStore.getState().setAuth(mockUser, "test-access-token", "test-refresh-token");

    const state = useAuthStore.getState();
    expect(state.user?.full_name).toBe("Admin User");
    expect(state.accessToken).toBe("test-access-token");
    expect(state.isAuthenticated).toBe(true);
  });

  it("should clear state on clearAuth", () => {
    const mockUser: AuthUser = {
      id: 2,
      phone: "+919876543211",
      email: "patient@example.com",
      full_name: "Patient User",
      role: "PATIENT",
      profile_picture: "",
      gender: "FEMALE",
      date_of_birth: null,
      date_joined: "2026-01-01",
    };
    useAuthStore.getState().setAuth(mockUser, "token-1", "token-2");
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
