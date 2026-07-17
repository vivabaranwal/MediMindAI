"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PrescriptionBuilder } from "@/components/senior-doctor/PrescriptionBuilder";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";
import { PrescriptionMedication } from "@/types/senior-doctor";

interface PrescriptionPageProps {
  params: {
    id: string;
  };
}

export default function PrescriptionPage({ params }: PrescriptionPageProps) {
  const {
    patients,
    assessments,
    recommendations,
    prescriptions,
    addMedication,
    removeMedication,
    approvePrescription,
    soapNotes,
    followups,
    loadEncounterForPatient,
    savePrescriptionDraft,
    approvePrescriptionApi,
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadEncounterForPatient(patientId);
      } catch (err: unknown) {
        if (active) {
          const e = err as Error;
          setError(e.message || "Failed to load patient and prescription details.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [patientId, loadEncounterForPatient]);

  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];
  const recommendationsState = recommendations[patientId];
  const patientRecs = useMemo(() => recommendationsState || [], [recommendationsState]);

  const soapNote = soapNotes[patientId];
  const prescription = prescriptions[patientId] || {
    patientId,
    selectedDiagnosis: "Acute Otitis Media",
    medications: [],
    status: "draft",
  };
  const followup = followups[patientId];

  // Pre-populate suggested medications if the prescription list is empty to assist workflow
  useEffect(() => {
    if (!isLoading && patient && (!prescriptions[patientId] || prescriptions[patientId].medications.length === 0)) {
      const medRecs = patientRecs.filter(r => r.type === "medication");
      if (medRecs.length > 0) {
        const rec = medRecs[0];
        const newMed = {
          id: `med-auto-${Date.now()}`,
          name: rec.title,
          dosage: "500 mg",
          frequency: "Once Daily (OD)",
          duration: "7 Days",
          instructions: "Post Meals",
          alerts: [],
        };
        addMedication(patientId, newMed);
        if (patient.encounterId) {
          savePrescriptionDraft(patient.encounterId, [newMed]).then((res) => {
            if (res?.success && res?.data) {
              useSeniorDoctorStore.setState((state) => ({
                prescriptions: {
                  ...state.prescriptions,
                  [patientId]: {
                    ...state.prescriptions[patientId],
                    dbId: res.data.id
                  }
                }
              }));
            }
          });
        }
      }
    }
  }, [isLoading, patient, patientId, patientRecs, addMedication, savePrescriptionDraft, prescriptions]);

  const handleAddMedication = async (med: PrescriptionMedication) => {
    if (!patient || !patient.encounterId) return;
    try {
      addMedication(patientId, med);
      const currentMedications = prescriptions[patientId]?.medications || [];
      const updatedMedications = [...currentMedications, med];
      const res = await savePrescriptionDraft(patient.encounterId, updatedMedications);
      if (res?.success && res?.data) {
        useSeniorDoctorStore.setState((state) => ({
          prescriptions: {
            ...state.prescriptions,
            [patientId]: {
              ...state.prescriptions[patientId],
              dbId: res.data.id
            }
          }
        }));
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to save prescription draft.");
    }
  };

  const handleRemoveMedication = async (medId: string) => {
    if (!patient || !patient.encounterId) return;
    try {
      removeMedication(patientId, medId);
      const currentMedications = prescriptions[patientId]?.medications || [];
      const updatedMedications = currentMedications.filter(m => m.id !== medId);
      const res = await savePrescriptionDraft(patient.encounterId, updatedMedications);
      if (res?.success && res?.data) {
        useSeniorDoctorStore.setState((state) => ({
          prescriptions: {
            ...state.prescriptions,
            [patientId]: {
              ...state.prescriptions[patientId],
              dbId: res.data.id
            }
          }
        }));
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to save prescription draft.");
    }
  };

  const handleApprove = async () => {
    if (!patient || !patient.encounterId) return;
    try {
      const rx = prescriptions[patientId];
      if (!rx) return;
      const resDraft = await savePrescriptionDraft(patient.encounterId, rx.medications);
      const dbId = rx.dbId || resDraft?.data?.id;
      if (!dbId) {
        throw new Error("Unable to resolve prescription database ID.");
      }
      await approvePrescriptionApi(dbId);
      approvePrescription(patientId);
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to approve prescription.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading Prescription Builder...
        </span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">
          {error || "Patient Record Not Found"}
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
            <Link href={`/senior-doctor/patient/${patientId}/followup`}>
              <Button variant="primary" className="font-bold tracking-wider">
                CONFIGURE FOLLOW-UP PLAN →
              </Button>
            </Link>
          </div>
        }
      />

      {/* Grid workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Prescription Builder, 7 cols) */}
        <div className="lg:col-span-7">
          <PrescriptionBuilder
            prescription={prescription}
            patientAllergies={patient.allergies || []}
            onAddMedication={handleAddMedication}
            onRemoveMedication={handleRemoveMedication}
            onApprove={handleApprove}
          />
        </div>

        {/* Right Column (Brief & Timeline, 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <DoctorBriefCard
            patient={patient}
            assessment={assessment}
            recommendations={patientRecs}
          />

          <ClinicalTimeline
            patient={patient}
            soapNote={soapNote}
            prescription={prescription}
            followupPlan={followup}
          />
        </div>

      </div>
    </div>
  );
}
