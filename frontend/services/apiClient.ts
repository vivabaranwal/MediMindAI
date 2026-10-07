import axios from "axios";

/**
 * All requests go to the same origin as the web app (`/api/...`); Next.js proxies them to the Laravel API
 * (see next.config.mjs). That makes the Sanctum session cookie first-party and httpOnly: page scripts never
 * see an auth credential, so there is nothing for an XSS bug to steal.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,
  withXSRFToken: true, // echo the XSRF-TOKEN cookie into the X-XSRF-TOKEN header (CSRF protection)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** Ask Laravel to set the CSRF cookie. Call before the first state-changing request (i.e. before signing in). */
export async function ensureCsrfCookie(): Promise<void> {
  await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
}

// Requests that legitimately return 401 without meaning "your session expired".
const AUTH_PROBES = ["/auth/login", "/auth/send-otp", "/user"];

apiClient.interceptors.response.use(
  (response) => {
    // Only writes announce a change. A GET that carried the marker would make the listener refetch it, forever.
    if (response.config.method !== "get" && response.data && response.data.event === "SOAP_GENERATED" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SOAP_GENERATED", { detail: { encounterId: response.data.encounter_id } }));
    }
    return response;
  },
  (error) => {
    const url: string = error.config?.url ?? "";
    if (typeof window !== "undefined" && error.response?.status === 401 && !AUTH_PROBES.some((p) => url.startsWith(p))) {
      // The session ended (expired, revoked or logged out elsewhere): return to the start page.
      window.location.assign("/");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
