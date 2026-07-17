"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSeniorDoctorStore, useSoapNoteSWR } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { SOAPEditor } from "@/components/senior-doctor/SOAPEditor";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { SOAPNote } from "@/types/senior-doctor";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";

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
    loadEncounterForPatient,
    saveSoapDraft,
    signSoapNote,
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const { isLoading: isSoapLoading } = useSoapNoteSWR(patient?.encounterId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setError(null);
        await loadEncounterForPatient(patientId);
      } catch (err: unknown) {
        if (active) {
          const e = err as Error;
          setError(e.message || "Failed to load patient and SOAP note.");
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [patientId, loadEncounterForPatient]);

  const assessment = assessments[patientId];
  const patientRecs = recommendations[patientId] || [];

  const soap = soapNotes[patientId];
  const prescription = prescriptions[patientId];
  const followup = followups[patientId];

  const handleSaveSoap = async (fields: Partial<SOAPNote>) => {
    if (!patient || !patient.encounterId) return;
    try {
      updateSoap(patientId, fields);
      const updatedSoap = {
        ...soap,
        ...fields
      } as SOAPNote;
      await saveSoapDraft(patient.encounterId, {
        subjective: updatedSoap.subjective,
        objective: updatedSoap.objective,
        assessment: updatedSoap.assessment,
        plan: updatedSoap.plan
      });
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to save SOAP note draft.");
    }
  };

  const handleApproveSoap = async () => {
    if (!patient || !patient.encounterId) return;
    try {
      await signSoapNote(patient.encounterId);
      approveSoap(patientId);
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to sign SOAP note.");
    }
  };

  if (isSoapLoading || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading SOAP Note Builder...
        </span>
      </div>
    );
  }

  if (error || !patient || !soap) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">
          {error || "Patient SOAP Record Not Found"}
        </h2>
        <Link href="/senior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

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
