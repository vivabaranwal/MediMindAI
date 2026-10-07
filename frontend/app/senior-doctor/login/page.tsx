import { DoctorLoginForm } from "@/components/auth/DoctorLoginForm";

export default function SeniorDoctorLogin() {
  return (
    <DoctorLoginForm
      gatewayLabel="Clinical Specialist Gateway"
      portalLabel="Senior Consultant Suite"
      heading="Specialist Sign-In"
      redirectTo="/senior-doctor/dashboard"
      requiredLevel="senior"
      footnote="Authorized clinical personnel only. Activity is audited."
    />
  );
}
