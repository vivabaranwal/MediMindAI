import { DoctorLoginForm } from "@/components/auth/DoctorLoginForm";

export default function JuniorDoctorLogin() {
  return (
    <DoctorLoginForm
      gatewayLabel="Clinical Portal Gateway"
      portalLabel="Junior Doctor Core"
      heading="Staff Authentication"
      redirectTo="/junior-doctor/dashboard"
      requiredLevel="junior"
      footnote="Authorized clinical personnel only. Activity is audited."
    />
  );
}
