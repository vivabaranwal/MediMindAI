"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PatientContextPanel } from "@/components/senior-doctor/PatientContextPanel";
import { AssessmentPanel } from "@/components/senior-doctor/AssessmentPanel";
import { AIIntelligencePanel } from "@/components/senior-doctor/AIIntelligencePanel";
import { ClinicalReviewLayout } from "@/components/senior-doctor/ClinicalReviewLayout";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";

interface ClinicalReviewPageProps {
  params: {
    id: string;
  };
}

const IDLE = { status: "idle" as const };

export default function ClinicalReviewPage({ params }: ClinicalReviewPageProps) {
  const patientId = Number(params.id);
  const {
    patients,
    assessments,
    recommendations,
    ai,
    updateRecommendationStatus,
    loadEncounterForPatient,
    loadBrief,
    loadSuggestions,
  } = useSeniorDoctorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadEncounterForPatient(patientId);
        void loadSuggestions(patientId); // cached for the session once ready
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load the patient record.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, loadEncounterForPatient, loadSuggestions]);

  const patient = patients.find((p) => p.id === patientId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading clinical review...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">{error || "Patient Record Not Found"}</h2>
        <Link href="/senior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const state = ai[patientId];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader
        patient={patient}
        backHref={`/senior-doctor/patient/${patientId}`}
        actionButton={
          <div className="flex gap-2">
            <Link href={`/senior-doctor/patient/${patientId}/soap`}>
              <Button variant="primary" className="font-bold tracking-wider">
                PROCEED TO SOAP NOTE →
              </Button>
            </Link>
          </div>
        }
      />

      <ClinicalReviewLayout
        leftColumn={<PatientContextPanel patient={patient} />}
        centerColumn={<AssessmentPanel assessment={assessments[patientId]} />}
        rightColumn={
          <AIIntelligencePanel
            patient={patient}
            recommendations={recommendations[patientId] || []}
            brief={state?.brief ?? IDLE}
            suggestions={state?.suggestions ?? IDLE}
            onRegenerateBrief={() => loadBrief(patientId, true)}
            onRegenerateSuggestions={() => loadSuggestions(patientId, true)}
            onRecommendationStatusChange={(recId, status, modified) => updateRecommendationStatus(patientId, recId, status, modified)}
          />
        }
      />
    </div>
  );
}
