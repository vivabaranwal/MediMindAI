"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSeniorDoctorStore, useSoapNote } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { SOAPEditor } from "@/components/senior-doctor/SOAPEditor";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { SOAPNote } from "@/types/senior-doctor";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";
import { toApiError } from "@/lib/errors";

interface SoapNotePageProps {
  params: {
    id: string;
  };
}

const IDLE = { status: "idle" as const };

export default function SoapNotePage({ params }: SoapNotePageProps) {
  const patientId = Number(params.id);
  const {
    patients,
    assessments,
    recommendations,
    soapNotes,
    updateSoap,
    approveSoap,
    prescriptions,
    followups,
    ai,
    loadEncounterForPatient,
    loadBrief,
    saveSoapDraft,
    signSoapNote,
  } = useSeniorDoctorStore();

  const patient = patients.find((p) => p.id === patientId);
  const { data: storedNote, isLoading: isNoteLoading, generate } = useSoapNote(patient?.encounterId, patientId);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const triedAuto = useRef(false);

  useEffect(() => {
    let active = true;
    loadEncounterForPatient(patientId).catch((err) => {
      if (active) setLoadError(err instanceof Error ? err.message : "Failed to load the patient record.");
    });
    return () => {
      active = false;
    };
  }, [patientId, loadEncounterForPatient]);

  const runGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await generate();
    } catch (err) {
      setGenerateError(toApiError(err, "Could not generate the SOAP draft.").message);
    } finally {
      setGenerating(false);
    }
  };

  // First visit with no note: ask the AI for a draft once. Failures show a retry, never fake text.
  useEffect(() => {
    if (patient?.encounterId && !isNoteLoading && storedNote === null && !triedAuto.current) {
      triedAuto.current = true;
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.encounterId, isNoteLoading, storedNote]);

  const soap = soapNotes[patientId];
  const state = ai[patientId];

  const handleSaveSoap = async (fields: Partial<SOAPNote>) => {
    if (!patient?.encounterId) return;
    setActionError(null);
    try {
      const merged = { ...soap, ...fields } as SOAPNote;
      await saveSoapDraft(patient.encounterId, {
        subjective: merged.subjective,
        objective: merged.objective,
        assessment: merged.assessment,
        plan: merged.plan,
      });
      updateSoap(patientId, fields);
    } catch (err) {
      setActionError(toApiError(err, "Failed to save the SOAP draft.").message);
    }
  };

  const handleApproveSoap = async () => {
    if (!patient?.encounterId) return;
    setActionError(null);
    try {
      await signSoapNote(patient.encounterId);
      approveSoap(patientId);
    } catch (err) {
      setActionError(toApiError(err, "Failed to sign the SOAP note.").message);
    }
  };

  if (loadError) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">{loadError}</h2>
        <Link href="/senior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!patient || !patient.encounterId || isNoteLoading || generating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {generating ? "AI is drafting the SOAP note..." : "Loading SOAP Note Builder..."}
        </span>
      </div>
    );
  }

  // No note and the AI could not draft one: offer retry or manual authoring.
  if (!soap && storedNote === null) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-4 text-left">
        {generateError && (
          <Alert type="error" titleText="SOAP draft unavailable">
            {generateError}
          </Alert>
        )}
        <div className="flex gap-3">
          <Button variant="primary" onClick={runGenerate}>
            RETRY AI DRAFT
          </Button>
          <Button variant="secondary" onClick={() => updateSoap(patientId, { subjective: "", objective: "", assessment: "", plan: "", status: "draft" })}>
            WRITE MANUALLY
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
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

      {actionError && (
        <Alert type="error" titleText="Action failed">
          {actionError}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          {soap && storedNote?.is_ai_generated && soap.status !== "approved" && (
            <Alert type="info" titleText="AI-drafted note">
              This draft was generated by AI from the documented record. Physical examination findings are not invented, so complete them yourself. Review
              and edit before signing.
            </Alert>
          )}
          {soap && <SOAPEditor soapNote={soap} onSave={handleSaveSoap} onApprove={handleApproveSoap} />}
          {soap && soap.status !== "approved" && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                className="text-[10px] font-bold uppercase"
                onClick={() => {
                  if (window.confirm("Replace the current draft with a new AI draft? Any edits you made will be lost.")) void runGenerate();
                }}
              >
                REGENERATE AI DRAFT
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <DoctorBriefCard
            patient={patient}
            assessment={assessments[patientId]}
            recommendations={recommendations[patientId] || []}
            brief={state?.brief ?? IDLE}
            onRegenerateBrief={() => loadBrief(patientId, true)}
          />
          <ClinicalTimeline patient={patient} soapNote={soap} prescription={prescriptions[patientId]} followupPlan={followups[patientId]} />
        </div>
      </div>
    </div>
  );
}
