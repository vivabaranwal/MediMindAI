import { DoctorLoginForm } from "@/components/auth/DoctorLoginForm";

export default function AdminLogin() {
  return (
    <DoctorLoginForm
      gatewayLabel="Administration Gateway"
      portalLabel="Admin Control Panel"
      heading="Administrator Sign-In"
      redirectTo="/admin"
      allowedRoles={["clinic_admin", "super_admin"]}
      footnote="Authorized administrators only. Activity is audited."
    />
  );
}
