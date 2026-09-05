/**
 * Axios HTTP client with JWT interceptors.
 *
 * - Request interceptor: attaches Bearer token from auth store
 * - Response interceptor: auto-refreshes access token on 401 (single-flight mutex)
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

// LAN demo: Derive API and WebSocket URLs dynamically at runtime from window.location
export function getApiBaseUrl(): string {
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  const protocol = typeof window !== "undefined" && window.location.protocol ? window.location.protocol : "http:";

  if (import.meta.env.VITE_API_URL) {
    const envUrl = import.meta.env.VITE_API_URL;
    // If accessing via LAN host (phone) but env has localhost, adapt localhost to current host IP
    if (host !== "localhost" && host !== "127.0.0.1" && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return envUrl.replace(/localhost|127\.0\.0\.1/, host);
    }
    return envUrl;
  }
  return `${protocol}//${host}:8000/api/v1`;
}

export function getWsBaseUrl(path: string = ""): string {
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  if (import.meta.env.VITE_WS_URL) {
    let base = import.meta.env.VITE_WS_URL.replace(/\/+$/, "");
    if (host !== "localhost" && host !== "127.0.0.1" && (base.includes("localhost") || base.includes("127.0.0.1"))) {
      base = base.replace(/localhost|127\.0\.0\.1/, host);
    }
    return `${base}${cleanPath}`;
  }
  return `${protocol}//${host}:8000/ws${cleanPath}`;
}

export const API_URL = getApiBaseUrl();

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach token & ensure dynamic baseURL ──
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Ensure baseURL is dynamically set based on active window hostname
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: single-flight refresh on 401 ──
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 and if we haven't already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't refresh on login / register / refresh endpoints
    const skipPaths = ["/auth/login/", "/auth/register/", "/auth/refresh/"];
    if (skipPaths.some((p) => originalRequest.url?.includes(p))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request — wait for the in-flight refresh
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      const { data } = await axios.post(`${API_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess: string = data.access;
      const newRefresh: string = data.refresh || refreshToken;

      localStorage.setItem("access_token", newAccess);
      localStorage.setItem("refresh_token", newRefresh);

      processQueue(null, newAccess);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear auth on failed refresh
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { client as apiClient, client };
export default client;
