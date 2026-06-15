"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useJuniorDoctorStore, mockDoctors } from "@/store/juniorDoctorStore";
import { PatientHeader } from "@/components/junior-doctor/PatientHeader";
import { AssessmentWorkspace } from "@/components/junior-doctor/AssessmentWorkspace";
import { SummaryCard } from "@/components/junior-doctor/SummaryCard";
import { SendCasePanel } from "@/components/junior-doctor/SendCasePanel";
import { AssessmentTimeline } from "@/components/junior-doctor/AssessmentTimeline";
import { Button } from "@/components/ui/Button";
import { CaseSummary } from "@/types/junior-doctor";

interface SummaryPageProps {
  params: {
    id: string;
  };
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const { patients, assessments, sendToSenior } = useJuniorDoctorStore();
  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];

  const [localSummary, setLocalSummary] = useState<CaseSummary | null>(assessment?.summary || null);

  if (!patient || !assessment || !assessment.summary) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Case Summary Not Found</h2>
        <p className="text-sm text-gray-450">The clinical brief has not been compiled for this patient yet.</p>
        <Link href={`/junior-doctor/patient/${patientId}/questions`}>
          <Button variant="primary">Go to Question Workspace</Button>
        </Link>
      </div>
    );
  }

  const handleUpdateSummaryField = (field: keyof CaseSummary, value: string | string[]) => {
    const activeSummary = localSummary || assessment.summary;
    if (!activeSummary) return;
    setLocalSummary({
      ...activeSummary,
      [field]: value,
    });
  };

  const handleSendToSenior = (doctorId: string) => {
    sendToSenior(patientId, doctorId);
  };

  const isSent = patient.status === "Completed";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader
        patient={patient}
        backHref={isSent ? "/junior-doctor/dashboard" : `/junior-doctor/patient/${patientId}/questions`}
      />

      <AssessmentWorkspace>
        {/* Left Area (8 cols): SOAP Summary Card */}
        <div className="lg:col-span-8 space-y-6">
          <SummaryCard
            summary={localSummary || assessment.summary}
            onUpdateSummaryField={handleUpdateSummaryField}
            readOnly={isSent}
          />

          {isSent && (
            <div className="flex justify-end gap-3">
              <Link href="/junior-doctor/dashboard">
                <Button variant="secondary">RETURN TO DASHBOARD</Button>
              </Link>
              <Link href="/junior-doctor/queue">
                <Button variant="primary">VIEW NEXT PATIENT QUEUE</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right Area (4 cols): Dispatch & Timeline */}
        <div className="lg:col-span-4 space-y-6">
          <SendCasePanel
            doctors={mockDoctors}
            onSend={handleSendToSenior}
            className={isSent ? "opacity-90 pointer-events-none" : ""}
          />

          <AssessmentTimeline patient={patient} assessment={assessment} />
        </div>
      </AssessmentWorkspace>
    </div>
  );
}
