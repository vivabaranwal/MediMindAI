"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, User } from "@/store/authStore";

/**
 * Client-side route guard for a portal. It asks the server who is signed in and redirects to `loginPath`
 * when nobody is, or when the role is not allowed. This is a UX convenience only; every API call is
 * authorised again by the backend.
 */
export function useRequireRole(
  allowedRoles: string[],
  loginPath: string,
  options: { skip?: boolean; level?: "junior" | "senior" } = {},
): { ready: boolean; user: User | null } {
  const { skip = false, level } = options;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authChecked = useAuthStore((s) => s.ready);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const roleAllowed = !!user && allowedRoles.includes(user.role);
  // A doctor belongs to one portal: a junior never opens senior pages, and the reverse.
  const wrongLevel = roleAllowed && !!level && user?.role === "doctor" && user.doctor_level !== level;
  const allowed = roleAllowed && !wrongLevel;

  useEffect(() => {
    if (skip || !authChecked || allowed) return;
    if (wrongLevel && user?.doctor_level) {
      router.replace(user.doctor_level === "junior" ? "/junior-doctor/dashboard" : "/senior-doctor/dashboard");
    } else {
      router.replace(loginPath);
    }
  }, [skip, authChecked, allowed, wrongLevel, user, router, loginPath]);

  return { ready: authChecked && allowed, user: allowed ? user : null };
}
