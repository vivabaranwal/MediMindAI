"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PrescriptionBuilder } from "@/components/senior-doctor/PrescriptionBuilder";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";
import { PrescriptionMedication } from "@/types/senior-doctor";
import { toApiError } from "@/lib/errors";

interface PrescriptionPageProps {
  params: {
    id: string;
  };
}

const IDLE = { status: "idle" as const };

export default function PrescriptionPage({ params }: PrescriptionPageProps) {
  const patientId = Number(params.id);
  const {
    patients,
    assessments,
    recommendations,
    prescriptions,
    addMedication,
    removeMedication,
    approvePrescription,
    setPrescriptionDiagnosis,
    soapNotes,
    followups,
    ai,
    loadEncounterForPatient,
    loadBrief,
    savePrescriptionDraft,
    approvePrescriptionApi,
  } = useSeniorDoctorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadEncounterForPatient(patientId);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load patient and prescription details.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, loadEncounterForPatient]);

  const patient = patients.find((p) => p.id === patientId);
  const prescription = prescriptions[patientId] ?? { patientId, selectedDiagnosis: "", medications: [], status: "draft" as const };
  const state = ai[patientId];

  /** Persist the full medication list and remember the draft's database id. */
  const persist = async (medications: PrescriptionMedication[]) => {
    if (!patient?.encounterId) return;
    const diagnosis = useSeniorDoctorStore.getState().prescriptions[patientId]?.selectedDiagnosis;
    const res = await savePrescriptionDraft(patient.encounterId, medications, undefined, undefined, diagnosis);
    if (res.success && res.data) {
      useSeniorDoctorStore.setState((s) => ({
        prescriptions: { ...s.prescriptions, [patientId]: { ...s.prescriptions[patientId], dbId: res.data!.id } },
      }));
    }
  };

  const handleAddMedication = async (med: PrescriptionMedication) => {
    setActionError(null);
    const previous = prescriptions[patientId]?.medications ?? [];
    addMedication(patientId, med);
    try {
      await persist([...previous, med]);
    } catch (err) {
      removeMedication(patientId, med.id); // keep the screen truthful: it was not saved
      setActionError(toApiError(err, "Failed to save the prescription draft.").message);
    }
  };

  const handleRemoveMedication = async (medId: string) => {
    setActionError(null);
    const previous = prescriptions[patientId]?.medications ?? [];
    removeMedication(patientId, medId);
    try {
      await persist(previous.filter((m) => m.id !== medId));
    } catch (err) {
      previous.forEach((m) => {
        if (m.id === medId) addMedication(patientId, m);
      });
      setActionError(toApiError(err, "Failed to save the prescription draft.").message);
    }
  };

  /** Throws on failure so the builder can offer the allergy-override confirmation. */
  const handleApprove = async (acknowledgeCritical: boolean) => {
    const rx = prescriptions[patientId];
    if (!patient?.encounterId || !rx) return;
    await persist(rx.medications);
    const dbId = useSeniorDoctorStore.getState().prescriptions[patientId]?.dbId;
    if (!dbId) throw new Error("The prescription draft could not be saved, so it cannot be approved.");
    await approvePrescriptionApi(dbId, acknowledgeCritical);
    approvePrescription(patientId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Prescription Builder...</span>
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

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader
        patient={patient}
        backHref={`/senior-doctor/patient/${patientId}`}
        actionButton={
          <div className="flex gap-2">
            <Link href={`/senior-doctor/patient/${patientId}/followup`}>
              <Button variant="primary" className="font-bold tracking-wider">
                CONFIGURE FOLLOW-UP PLAN →
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
        <div className="lg:col-span-7">
          <PrescriptionBuilder
            prescription={prescription}
            patientId={patientId}
            patientAllergies={patient.allergies || []}
            onAddMedication={handleAddMedication}
            onRemoveMedication={handleRemoveMedication}
            onDiagnosisChange={(text) => setPrescriptionDiagnosis(patientId, text)}
            diagnosisSuggestions={(recommendations[patientId] || []).filter((r) => r.type === "diagnosis").map((r) => r.title)}
            onApprove={handleApprove}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <DoctorBriefCard
            patient={patient}
            assessment={assessments[patientId]}
            recommendations={recommendations[patientId] || []}
            brief={state?.brief ?? IDLE}
            onRegenerateBrief={() => loadBrief(patientId, true)}
          />
          <ClinicalTimeline patient={patient} soapNote={soapNotes[patientId]} prescription={prescription} followupPlan={followups[patientId]} />
        </div>
      </div>
    </div>
  );
}
