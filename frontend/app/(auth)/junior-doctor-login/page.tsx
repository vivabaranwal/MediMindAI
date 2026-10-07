import { redirect } from "next/navigation";

// Legacy placeholder route ("Phase 2 - Locked"). The real sign-in lives at /junior-doctor/login.
export default function LegacyJuniorDoctorLogin() {
  redirect("/junior-doctor/login");
}
