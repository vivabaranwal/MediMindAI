"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { SOAPEditor } from "@/components/senior-doctor/SOAPEditor";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { SoapService } from "@/services/soap.service";
import { SOAPNote } from "@/types/senior-doctor";
import { Button } from "@/components/ui/Button";

interface SoapNotePageProps {
  params: {
    id: string;
  };
}

export default function SoapNotePage({ params }: SoapNotePageProps) {
  const {
    patients,
    assessments,
    recommendations,
    soapNotes,
    updateSoap,
    approveSoap,
    prescriptions,
    followups,
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];
  const patientRecs = recommendations[patientId] || [];

  const storeSoap = soapNotes[patientId];
  const prescription = prescriptions[patientId];
  const followup = followups[patientId];

  const [soap, setSoap] = useState<SOAPNote | null>(null);

  // Initialize SOAP note from store or generate default
  useEffect(() => {
    if (patient) {
      if (storeSoap) {
        setSoap(storeSoap);
      } else {
        const generated = SoapService.generateDefaultSoap(patient, assessment);
        updateSoap(patientId, generated);
        setSoap(generated);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, storeSoap, patientId]);

  if (!patient || !soap) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Patient Record Not Found</h2>
        <Link href="/senior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleSaveSoap = (fields: Partial<SOAPNote>) => {
    updateSoap(patientId, fields);
  };

  const handleApproveSoap = () => {
    approveSoap(patientId);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        backHref={`/senior-doctor/patient/${patientId}`}
        actionButton={
          <div className="flex gap-2">
            <Link href={`/senior-doctor/patient/${patientId}/prescription`}>
              <Button variant="primary" className="font-bold tracking-wider">
                BUILD PRESCRIPTION →
              </Button>
            </Link>
          </div>
        }
      />

      {/* Grid workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (SOAP Note editor, 7 cols) */}
        <div className="lg:col-span-7">
          <SOAPEditor
            soapNote={soap}
            onSave={handleSaveSoap}
            onApprove={handleApproveSoap}
          />
        </div>

        {/* Right Column (Brief & timeline, 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <DoctorBriefCard
            patient={patient}
            assessment={assessment}
            recommendations={patientRecs}
          />

          <ClinicalTimeline
            patient={patient}
            soapNote={soap}
            prescription={prescription}
            followupPlan={followup}
          />
        </div>

      </div>
    </div>
  );
}
