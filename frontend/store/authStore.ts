import { create } from "zustand";
import apiClient, { ensureCsrfCookie } from "@/services/apiClient";
import { toApiError } from "@/lib/errors";

export type DoctorLevel = "junior" | "senior";

export interface User {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  role: string;
  /** Present only for users with a doctor profile. */
  doctor_id: number | null;
  /** junior (intake) or senior (SOAP and prescribing). Present only for users with a doctor profile. */
  doctor_level?: "junior" | "senior" | null;
}

interface AuthStore {
  user: User | null;
  /** False until the first check of the server-side session has finished. */
  ready: boolean;
  loading: boolean;
  error: string | null;

  /** Ask the server who is signed in (the session cookie is the only credential). */
  initialize: () => Promise<void>;
  /** Sign in with email + password. If `allowedRoles` is given, other roles are signed straight back out. */
  loginWithPassword: (email: string, password: string, allowedRoles?: string[], requiredLevel?: DoctorLevel) => Promise<User>;
  sendOtp: (mobile: string) => Promise<void>;
  loginWithOtp: (mobile: string, otp: string) => Promise<User>;
  logout: () => Promise<void>;
}

let initializing: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  ready: false,
  loading: false,
  error: null,

  initialize: () => {
    if (get().ready) return Promise.resolve();
    // Several guards may ask at once; share one request.
    initializing ??= apiClient
      .get("/user")
      .then((res) => set({ user: res.data as User, ready: true }))
      .catch(() => set({ user: null, ready: true })) // 401 = nobody signed in
      .finally(() => {
        initializing = null;
      });
    return initializing;
  },

  loginWithPassword: async (email, password, allowedRoles, requiredLevel) => {
    set({ loading: true, error: null });
    try {
      await ensureCsrfCookie();
      const { data } = await apiClient.post("/auth/login", { email, password });
      const user: User = data.user;

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Valid credentials, wrong portal: don't keep a session for it.
        await apiClient.post("/auth/logout").catch(() => undefined);
        throw new Error("This account does not have access to this portal.");
      }

      // A doctor belongs to one portal. (Admins may enter either.)
      if (requiredLevel && user.role === "doctor" && user.doctor_level !== requiredLevel) {
        await apiClient.post("/auth/logout").catch(() => undefined);
        const other = requiredLevel === "senior" ? "junior" : "senior";
        throw new Error(`This portal is for ${requiredLevel} doctors. Please use the ${other} doctor portal.`);
      }

      set({ user, ready: true, loading: false });
      return user;
    } catch (err) {
      const msg = toApiError(err, "Sign-in failed.").message;
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  sendOtp: async (mobile) => {
    set({ loading: true, error: null });
    try {
      await ensureCsrfCookie();
      await apiClient.post("/auth/send-otp", { mobile });
      set({ loading: false });
    } catch (err) {
      const msg = toApiError(err, "Could not send a code.").message;
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  loginWithOtp: async (mobile, otp) => {
    set({ loading: true, error: null });
    try {
      await ensureCsrfCookie();
      const { data } = await apiClient.post("/auth/login", { mobile, otp });
      set({ user: data.user, ready: true, loading: false });
      return data.user as User;
    } catch (err) {
      const msg = toApiError(err, "Invalid or expired code.").message;
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // The session may already be gone; clearing local state is what matters.
    } finally {
      set({ user: null, ready: true });
    }
  },
}));
