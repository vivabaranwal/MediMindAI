"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { FollowUpPlanner } from "@/components/senior-doctor/FollowUpPlanner";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];
  const patientRecs = recommendations[patientId] || [];

  const soapNote = soapNotes[patientId];
  const prescription = prescriptions[patientId];
  const followup = followups[patientId];

  const [completing, setCompleting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSaveFollowUp = (timeframe: "3" | "7" | "14" | "30" | "custom", instructions: string, customDays?: string) => {
    saveFollowUp(patientId, timeframe, instructions, customDays);
  };

  const handleCompleteSignoff = () => {
    setCompleting(true);
    setTimeout(() => {
      completeConsultation(patientId);
      setCompleting(false);
      setSuccess(true);
    }, 1200);
  };

  // Signoff Checklist Validations
  const isSoapSigned = soapNote?.status === "approved";
  const isPrescriptionSigned = prescription?.status === "approved";
  const isFollowUpSaved = followup?.status === "saved";
  
  const canSignOff = isSoapSigned && isPrescriptionSigned && isFollowUpSaved;
  const isAlreadyCompleted = patient.status === "Completed";

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        backHref={`/senior-doctor/patient/${patientId}`}
      />

      {success || isAlreadyCompleted ? (
        <div className="max-w-2xl mx-auto text-center space-y-6 bg-white border border-gray-300 p-8 rounded-[4px] animate-fade-in-up">
          <div className="text-clinical-green text-5xl">✓</div>
          <div>
            <h2 className="text-xl font-bold text-gray-600 uppercase tracking-wider">Consultation Sign-Off Complete</h2>
            <p className="text-sm text-gray-450 mt-2">
              All clinical SOAP summaries, digital prescriptions, and post-care schedules are signed and locked in the patient EMR.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
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
  );
}
