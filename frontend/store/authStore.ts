import { create } from "zustand";
import apiClient from "@/services/apiClient";

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loginWithPassword: (email: string, password: string) => Promise<any>;
  sendOtp: (mobile: string) => Promise<any>;
  verifyOtp: (mobile: string, otp: string) => Promise<any>;
  loginWithOtp: (mobile: string, otp: string) => Promise<any>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        try {
          set({ token, user: JSON.parse(userStr) });
        } catch {
          // Clear invalid storage
          localStorage.removeItem("token");
          localStorage.removeItem("sanctum_token");
          localStorage.removeItem("user");
        }
      }
    }
  },

  loginWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const data = res.data;
      if (data.success && data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("sanctum_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        set({ user: data.user, token: data.access_token, loading: false });
        return data;
      } else {
        throw new Error(data.message || "Failed to log in");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Authorization Failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  sendOtp: async (mobile) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post("/auth/send-otp", { mobile });
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to send OTP";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  verifyOtp: async (mobile, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post("/auth/verify-otp", { mobile, otp });
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Invalid or expired OTP";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  loginWithOtp: async (mobile, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post("/auth/login", { mobile, otp });
      const data = res.data;
      if (data.success && data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("sanctum_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        set({ user: data.user, token: data.access_token, loading: false });
        return data;
      } else {
        throw new Error(data.message || "Failed to log in");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Authorization Failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("sanctum_token");
      localStorage.removeItem("user");
      set({ user: null, token: null });
    }
  },
}));
