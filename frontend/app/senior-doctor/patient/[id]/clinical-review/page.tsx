"use client";

import React from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PatientContextPanel } from "@/components/senior-doctor/PatientContextPanel";
import { AssessmentPanel } from "@/components/senior-doctor/AssessmentPanel";
import { AIIntelligencePanel } from "@/components/senior-doctor/AIIntelligencePanel";
import { ClinicalReviewLayout } from "@/components/senior-doctor/ClinicalReviewLayout";
import { Button } from "@/components/ui/Button";

interface ClinicalReviewPageProps {
  params: {
    id: string;
  };
}

export default function ClinicalReviewPage({ params }: ClinicalReviewPageProps) {
  const {
    patients,
    assessments,
    recommendations,
    similarCases,
    outcomeStats,
    updateRecommendationStatus,
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  
  const assessment = assessments[patientId];
  const patientRecs = recommendations[patientId] || [];
  const patientCases = similarCases[patientId] || [];
  const patientStats = outcomeStats[patientId] || [];

  if (!patient) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Patient Record Not Found</h2>
        <Link href="/senior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleRecommendationStatusChange = (
    recId: string,
    status: "pending" | "accepted" | "modified" | "rejected",
    modifiedValue?: string
  ) => {
    updateRecommendationStatus(patientId, recId, status, modifiedValue);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Patient Header Banner */}
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

      {/* Main Three-Column Workspace Area */}
      <ClinicalReviewLayout
        leftColumn={<PatientContextPanel patient={patient} />}
        centerColumn={<AssessmentPanel assessment={assessment} />}
        rightColumn={
          <AIIntelligencePanel
            recommendations={patientRecs}
            similarCases={patientCases}
            outcomeStats={patientStats}
            onRecommendationStatusChange={handleRecommendationStatusChange}
          />
        }
      />
    </div>
  );
}
