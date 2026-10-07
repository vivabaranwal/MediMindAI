import { redirect } from "next/navigation";

// Legacy placeholder route. The real sign-in lives at /senior-doctor/login.
export default function LegacySeniorDoctorLogin() {
  redirect("/senior-doctor/login");
}
