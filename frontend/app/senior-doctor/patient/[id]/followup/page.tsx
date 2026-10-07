"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { FollowUpPlanner } from "@/components/senior-doctor/FollowUpPlanner";
import { PrescriptionPrintSheet } from "@/components/senior-doctor/PrescriptionPrintSheet";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { toApiError } from "@/lib/errors";
import { toLocalIsoDate } from "@/lib/dates";
import { useAuthStore } from "@/store/authStore";

const IDLE = { status: "idle" as const };

interface FollowUpPageProps {
  params: {
    id: string;
  };
}

export default function FollowUpPage({ params }: FollowUpPageProps) {
  const {
    patients,
    assessments,
    recommendations,
    soapNotes,
    prescriptions,
    followups,
    saveFollowUp,
    completeConsultation,
    ai,
    loadBrief,
    loadEncounterForPatient,
    savePrescriptionDraft,
    completeConsultationApi,
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const doctorUser = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
          setError(e.message || "Failed to load patient and care plan details.");
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
  const patientRecs = recommendations[patientId] || [];

  const soapNote = soapNotes[patientId];
  const prescription = prescriptions[patientId];
  const followup = followups[patientId];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading Care Planner...
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

  const handleSaveFollowUp = async (timeframe: "3" | "7" | "14" | "30" | "custom", instructions: string, customDays?: string) => {
    saveFollowUp(patientId, timeframe, instructions, customDays);
    if (!patient || !patient.encounterId) return;
    try {
      const rx = prescriptions[patientId] || { medications: [] };
      let days = 7;
      if (timeframe === "3") days = 3;
      else if (timeframe === "7") days = 7;
      else if (timeframe === "14") days = 14;
      else if (timeframe === "30") days = 30;
      else if (timeframe === "custom" && customDays) days = Number(customDays) || 7;

      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + days);
      const followupDateStr = toLocalIsoDate(dateObj);

      const res = await savePrescriptionDraft(
        patient.encounterId,
        rx.medications,
        instructions,
        followupDateStr
      );

      const savedId = res.data?.id;
      if (res.success && savedId) {
        useSeniorDoctorStore.setState((state) => ({
          prescriptions: {
            ...state.prescriptions,
            [patientId]: {
              ...state.prescriptions[patientId],
              dbId: savedId
            }
          }
        }));
      }
    } catch (err) {
      setActionError(toApiError(err, "Failed to save follow-up details.").message);
    }
  };

  const handleCompleteSignoff = async () => {
    if (!patient || !patient.encounterId) return;
    try {
      setCompleting(true);
      await completeConsultationApi(patient.encounterId);
      completeConsultation(patientId);
      setSuccess(true);
    } catch (err) {
      setActionError(toApiError(err, "Failed to complete the consultation sign-off.").message);
    } finally {
      setCompleting(false);
    }
  };

  // Signoff Checklist Validations
  const isSoapSigned = soapNote?.status === "approved";
  const isPrescriptionSigned = prescription?.status === "approved";
  const isFollowUpSaved = followup?.status === "saved";
  
  const canSignOff = isSoapSigned && isPrescriptionSigned && isFollowUpSaved;
  const isAlreadyCompleted = patient.status === "Completed";

  const followUpDays = followup ? (followup.timeframe === "custom" ? Number(followup.customDays) || 0 : Number(followup.timeframe)) : 0;
  const followUpLabel = followUpDays > 0 ? `After ${followUpDays} days` : null;
  const isDone = success || isAlreadyCompleted;
  const printable = isDone && prescription?.status === "approved" && prescription.medications.length > 0;

  return (
    <>
    <div className="space-y-8 animate-fade-in-up print:hidden">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        backHref={`/senior-doctor/patient/${patientId}`}
      />

      {actionError && (
        <Alert type="error" titleText="Action failed">
          {actionError}
        </Alert>
      )}

      {success || isAlreadyCompleted ? (
        <div className="max-w-2xl mx-auto text-center space-y-6 bg-white border border-gray-300 p-8 rounded-[4px] animate-fade-in-up">
          <div className="text-clinical-green text-5xl">✓</div>
          <div>
            <h2 className="text-xl font-bold text-gray-600 uppercase tracking-wider">Consultation Sign-Off Complete</h2>
            <p className="text-sm text-gray-450 mt-2">
              All clinical SOAP summaries, digital prescriptions, and post-care schedules are signed and locked in the patient EMR.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-gray-200">
            {printable && (
              <Button variant="secondary" size="md" onClick={() => window.print()}>PRINT PRESCRIPTION</Button>
            )}
            <Link href="/senior-doctor/dashboard">
              <Button variant="secondary" size="md">RETURN TO DASHBOARD</Button>
            </Link>
            <Link href="/senior-doctor/queue">
              <Button variant="primary" size="md">CONSULT NEXT PATIENT</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Planner & Completion Panel, 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <FollowUpPlanner
              initialTimeframe={followup?.timeframe}
              initialInstructions={followup?.instructions}
              initialCustomDays={followup?.customDays}
              onSave={handleSaveFollowUp}
            />

            {/* Handoff Validation Box */}
            <Card titleText="CONSULTATION CLOSURE CONTROL" className="border border-gray-300">
              <p className="text-xs text-gray-450 uppercase font-semibold leading-relaxed mb-4">
                Before transferring case files to permanent digital storage, verify all check-in tasks:
              </p>

              {/* Checklist visual markers */}
              <div className="space-y-3 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 pb-5 mb-5">
                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded">
                  <span className="text-gray-550">1. SOAP Clinical Brief approved & signed</span>
                  <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded ${
                    isSoapSigned ? "bg-clinical-green-light text-clinical-green" : "bg-clinical-amber-light text-clinical-amber"
                  }`}>
                    {isSoapSigned ? "✓ COMPLETED" : "⚠️ PENDING APPROVAL"}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded">
                  <span className="text-gray-550">2. Pharmacotherapy Prescription approved & signed</span>
                  <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded ${
                    isPrescriptionSigned ? "bg-clinical-green-light text-clinical-green" : "bg-clinical-amber-light text-clinical-amber"
                  }`}>
                    {isPrescriptionSigned ? "✓ COMPLETED" : "⚠️ PENDING REGIMEN"}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded">
                  <span className="text-gray-550">3. Follow-Up check-in instructions configured</span>
                  <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded ${
                    isFollowUpSaved ? "bg-clinical-green-light text-clinical-green" : "bg-clinical-amber-light text-clinical-amber"
                  }`}>
                    {isFollowUpSaved ? "✓ COMPLETED" : "⚠️ PENDING CARE PLAN"}
                  </span>
                </div>
              </div>

              {!canSignOff && (
                <div className="mb-4 text-xs font-semibold text-clinical-amber leading-relaxed bg-clinical-amber-light/25 border-l-[3px] border-clinical-amber p-3.5 rounded text-left uppercase">
                  ⚠️ WARNING: Please ensure SOAP note is signed, prescription is finalized, and follow-up is saved above to enable consultation closure buttons.
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  className="w-full tracking-wider font-bold text-xs py-3"
                  onClick={handleCompleteSignoff}
                  disabled={completing || !canSignOff}
                >
                  {completing ? "DIGITALLY SIGNING CASE..." : "COMPLETE CONSULTATION SIGN-OFF"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column (Brief & timeline, 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <DoctorBriefCard
              patient={patient}
              assessment={assessment}
              recommendations={patientRecs}
              brief={ai[patientId]?.brief ?? IDLE}
              onRegenerateBrief={() => loadBrief(patientId, true)}
            />

            <ClinicalTimeline
              patient={patient}
              soapNote={soapNote}
              prescription={prescription}
              followupPlan={followup}
            />
          </div>

        </div>
      )}
    </div>

    {printable && (
      <section className="mt-8 print:mt-0">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 print:hidden">Prescription Preview</h2>
        <div className="w-fit max-w-full overflow-x-auto mx-auto border border-gray-300 shadow-sm print:w-auto print:overflow-visible print:border-0 print:shadow-none">
          <PrescriptionPrintSheet
            patient={patient}
            prescription={prescription}
            doctorName={doctorUser?.name || patient.assignedDoctor || "Prescribing doctor"}
            complaint={patient.chiefComplaint}
            advice={followup?.instructions}
            followUp={followUpLabel}
          />
        </div>
      </section>
    )}
    </>
  );
}
