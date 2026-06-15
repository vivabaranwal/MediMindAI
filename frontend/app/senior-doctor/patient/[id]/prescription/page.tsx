"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { PatientHeader } from "@/components/senior-doctor/PatientHeader";
import { PrescriptionBuilder } from "@/components/senior-doctor/PrescriptionBuilder";
import { DoctorBriefCard } from "@/components/senior-doctor/DoctorBriefCard";
import { ClinicalTimeline } from "@/components/senior-doctor/ClinicalTimeline";
import { Button } from "@/components/ui/Button";

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
  } = useSeniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];
  const patientRecs = recommendations[patientId] || [];

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
    if (patient && (!prescriptions[patientId] || prescriptions[patientId].medications.length === 0)) {
      // Find medication recommendations
      const medRecs = patientRecs.filter(r => r.type === "medication");
      if (medRecs.length > 0) {
        // Pre-initialize with the first recommended med
        const rec = medRecs[0];
        addMedication(patientId, {
          id: `med-auto-${Date.now()}`,
          name: rec.title,
          dosage: "500 mg",
          frequency: "Once Daily (OD)",
          duration: "7 Days",
          instructions: "Post Meals",
          alerts: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, patientId]);

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
            onAddMedication={(med) => addMedication(patientId, med)}
            onRemoveMedication={(medId) => removeMedication(patientId, medId)}
            onApprove={() => approvePrescription(patientId)}
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
