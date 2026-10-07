"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { PatientHeader } from "@/components/junior-doctor/PatientHeader";
import { AssessmentTimeline } from "@/components/junior-doctor/AssessmentTimeline";
import { AssessmentWorkspace } from "@/components/junior-doctor/AssessmentWorkspace";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import apiClient from "@/services/apiClient";
import { toApiError } from "@/lib/errors";
import { ReportDto } from "@/types/ai";

interface PatientDetailsPageProps {
  params: {
    id: string;
  };
}

interface PatientProfile {
  mobile: string | null;
  date_of_birth: string | null;
  age: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_mobile: string | null;
  ai_consent: boolean;
}

const REPORT_STATUS: Record<ReportDto["status"], string> = {
  pending_analysis: "Queued for analysis",
  analyzing: "Analysing…",
  analyzed: "Analysed",
  failed: "Analysis failed",
  not_analyzed: "Not analysed",
};

const show = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? "Not recorded" : String(value));

export default function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  const router = useRouter();
  const { patients, assessments } = useJuniorDoctorStore();
  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, r] = await Promise.all([
          apiClient.get(`/patients/${patientId}`),
          apiClient.get("/reports", { params: { patient_id: patientId } }),
        ]);
        if (!active) return;
        setProfile(p.data?.data ?? null);
        setReports(r.data?.data ?? []);
      } catch (err) {
        if (active) setLoadError(toApiError(err, "Could not load the patient's details.").message);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  if (!patient) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Patient Record Not Found</h2>
        <p className="text-sm text-gray-400">This patient is not in today&apos;s queue.</p>
        <Link href="/junior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleAssessmentAction = () => {
    if (patient.status === "Completed") {
      router.push(`/junior-doctor/patient/${patient.id}/summary`);
    } else if (patient.status === "In Assessment") {
      // Resume only if the live session belongs to this exact appointment.
      const hasLiveQuestions = assessment && assessment.questions.length > 0 && assessment.appointmentId === patient.appointmentId;
      router.push(`/junior-doctor/patient/${patient.id}/${hasLiveQuestions ? "questions" : "assessment"}`);
    } else {
      router.push(`/junior-doctor/patient/${patient.id}/assessment`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader
        patient={patient}
        backHref="/junior-doctor/dashboard"
        actionButton={
          <Button variant="primary" size="md" onClick={handleAssessmentAction} className="font-bold tracking-wider">
            {patient.status === "Completed" ? "VIEW CASE SUMMARY" : patient.status === "In Assessment" ? "RESUME CLINICAL INTAKE" : "START CLINICAL INTAKE"}
          </Button>
        }
      />

      {loadError && (
        <Alert type="error" titleText="Could not load details">
          {loadError}
        </Alert>
      )}

      {profile && !profile.ai_consent && (
        <Alert type="warning" titleText="No AI consent on file">
          This patient has not consented to AI-assisted processing, so AI intake questions and summaries are unavailable. Ask reception to record their
          consent.
        </Alert>
      )}

      <AssessmentWorkspace>
        <div className="lg:col-span-8 space-y-8">
          <Card titleText="Demographic Information" className="border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-semibold uppercase tracking-wider text-gray-650">
              {[
                ["Registration Code", patient.code],
                ["Contact Number", show(profile?.mobile)],
                ["Age", show(profile?.age ?? patient.age)],
                ["Date of Birth", show(profile?.date_of_birth?.slice(0, 10))],
                ["Address", show(profile?.address)],
                ["Assigned Doctor", patient.assignedDoctor || "Unassigned"],
                [
                  "Emergency Contact",
                  profile?.emergency_contact_name
                    ? `${profile.emergency_contact_name}${profile.emergency_contact_mobile ? ` (${profile.emergency_contact_mobile})` : ""}`
                    : "Not recorded",
                ],
                ["Allergies", patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None documented"],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-gray-150 pb-2">
                  <span className="text-[10px] text-gray-400 block font-bold">{label}</span>
                  <span className="text-sm font-bold text-gray-600 normal-case">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card titleText="Triage Vitals" className="border border-gray-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                ["Blood Pressure", patient.vitals?.bp],
                ["Heart Rate", patient.vitals?.hr !== undefined ? `${patient.vitals.hr} bpm` : undefined],
                ["Temperature", patient.vitals?.temp],
                ["Oxygen SpO2", patient.vitals?.spo2 !== undefined ? `${patient.vitals.spo2}%` : undefined],
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">{label}</span>
                  <span className="text-lg font-bold text-gray-600">{value ?? "--"}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 normal-case font-normal">Vitals are recorded during the clinical intake.</p>
          </Card>

          <Card titleText="Uploaded Reports" className="border border-gray-300">
            {reports.length === 0 ? (
              <p className="text-xs text-gray-450 text-center py-4 font-semibold uppercase tracking-wider">No reports uploaded for this patient.</p>
            ) : (
              <div className="space-y-3 font-semibold uppercase tracking-wider text-xs">
                {reports.map((r) => (
                  <div key={r.id} className="p-3 border border-gray-200 rounded bg-white">
                    <span className="text-gray-600 font-bold block">{r.file_name}</span>
                    <span className="text-[10px] text-gray-400 block">
                      {r.report_type.replace("_", " ")} · {REPORT_STATUS[r.status]}
                    </span>
                    {r.ai_summary && <p className="normal-case font-normal text-xs text-gray-550 mt-1.5 leading-relaxed">{r.ai_summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <AssessmentTimeline patient={patient} assessment={assessment} />

          <Card titleText="Intake guidance" className="border border-gray-300">
            <div className="text-xs text-gray-500 space-y-3 leading-relaxed uppercase font-semibold">
              <p>• Confirm the complaint and its duration with the patient before generating AI questions.</p>
              <p>• Record vitals as measured; leave blank any that were not taken.</p>
              <p>• Emergency presentations should go straight to the senior doctor.</p>
            </div>
          </Card>
        </div>
      </AssessmentWorkspace>
    </div>
  );
}
