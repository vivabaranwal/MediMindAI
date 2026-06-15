"use client";

import React from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PatientContextPanel } from "@/components/senior-doctor/PatientContextPanel";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PatientDetailsPageProps {
  params: {
    id: string;
  };
}

export default function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  const { patients, soapNotes, prescriptions, followups } = useSeniorDoctorStore();
  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);

  const soapNote = soapNotes[patientId];
  const prescription = prescriptions[patientId];
  const followup = followups[patientId];

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

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        backHref="/senior-doctor/dashboard"
        actionButton={
          <div className="flex gap-2">
            <Link href={`/senior-doctor/patient/${patientId}/clinical-review`}>
              <Button variant="primary" className="font-bold tracking-wider">
                OPEN CLINICAL REVIEW
              </Button>
            </Link>
          </div>
        }
      />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Demographics & Scans, 5 cols) */}
        <div className="lg:col-span-5">
          <PatientContextPanel patient={patient} />
        </div>

        {/* Right Column (Clinical Workspaces & Timeline, 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Clinical Workspace Navigator Card */}
          <Card titleText="CONSULTATION WORKSPACE SUITE" className="border border-gray-300">
            <p className="text-xs text-gray-450 uppercase font-semibold leading-relaxed mb-4">
              Access specific clinical modules below to draft documentation, review AI alerts, build prescription sheets, and complete consultations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 p-4 rounded flex flex-col justify-between space-y-3 bg-gray-50/50">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">MODULE 1</span>
                  <h4 className="text-xs font-bold text-gray-650 uppercase tracking-wider mt-0.5">Clinical Review Center</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                    Inspect AI differentials, OCR lab metrics, and similar patient outcomes.
                  </p>
                </div>
                <Link href={`/senior-doctor/patient/${patientId}/clinical-review`}>
                  <Button variant="secondary" size="sm" className="w-full text-xs uppercase">Open Reviewer</Button>
                </Link>
              </div>

              <div className="border border-gray-200 p-4 rounded flex flex-col justify-between space-y-3 bg-gray-50/50">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">MODULE 2</span>
                  <h4 className="text-xs font-bold text-gray-650 uppercase tracking-wider mt-0.5">Clinical SOAP Notes</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                    Draft and sign off Subjective/Objective consultation briefs.
                  </p>
                </div>
                <Link href={`/senior-doctor/patient/${patientId}/soap`}>
                  <Button variant="secondary" size="sm" className="w-full text-xs uppercase">Open SOAP Builder</Button>
                </Link>
              </div>

              <div className="border border-gray-200 p-4 rounded flex flex-col justify-between space-y-3 bg-gray-50/50">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">MODULE 3</span>
                  <h4 className="text-xs font-bold text-gray-650 uppercase tracking-wider mt-0.5">Prescription Builder</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                    Select and audit medication regimens with automated allergen scans.
                  </p>
                </div>
                <Link href={`/senior-doctor/patient/${patientId}/prescription`}>
                  <Button variant="secondary" size="sm" className="w-full text-xs uppercase">Open Rx Builder</Button>
                </Link>
              </div>

              <div className="border border-gray-200 p-4 rounded flex flex-col justify-between space-y-3 bg-gray-50/50">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">MODULE 4</span>
                  <h4 className="text-xs font-bold text-gray-650 uppercase tracking-wider mt-0.5">Follow-Up & Closure</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                    Schedule check-ins, record instructions, and complete consult sign-off.
                  </p>
                </div>
                <Link href={`/senior-doctor/patient/${patientId}/followup`}>
                  <Button variant="secondary" size="sm" className="w-full text-xs uppercase">Open Care Planner</Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Workflow progress timeline */}
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
