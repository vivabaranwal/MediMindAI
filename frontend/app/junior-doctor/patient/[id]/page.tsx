"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { PatientHeader } from "@/components/junior-doctor/PatientHeader";
import { AssessmentTimeline } from "@/components/junior-doctor/AssessmentTimeline";
import { AssessmentWorkspace } from "@/components/junior-doctor/AssessmentWorkspace";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PatientDetailsPageProps {
  params: {
    id: string;
  };
}

export default function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  const router = useRouter();
  const { patients, assessments } = useJuniorDoctorStore();
  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];

  if (!patient) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Patient Record Not Found</h2>
        <p className="text-sm text-gray-400">The requested record code does not exist in this facility queue.</p>
        <Link href="/junior-doctor/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleAssessmentAction = () => {
    if (patient.status === "Completed") {
      router.push(`/junior-doctor/patient/${patient.id}/summary`);
    } else if (patient.status === "In Assessment") {
      // Check if they already have questions generated, if so go straight to questions page
      if (assessment && assessment.questions.length > 0) {
        router.push(`/junior-doctor/patient/${patient.id}/questions`);
      } else {
        router.push(`/junior-doctor/patient/${patient.id}/assessment`);
      }
    } else {
      router.push(`/junior-doctor/patient/${patient.id}/assessment`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Patient Header Banner */}
      <PatientHeader
        patient={patient}
        backHref="/junior-doctor/dashboard"
        actionButton={
          <Button variant="primary" size="md" onClick={handleAssessmentAction} className="font-bold tracking-wider">
            {patient.status === "Completed"
              ? "VIEW CASE SUMMARY"
              : patient.status === "In Assessment"
              ? "RESUME CLINICAL INTAKE"
              : "START CLINICAL INTAKE"}
          </Button>
        }
      />

      {/* Main Grid View */}
      <AssessmentWorkspace>
        {/* Left demographics + vitals block */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* General Demographic Information */}
          <Card titleText="Demographic Information" className="border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-semibold uppercase tracking-wider text-gray-650">
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">Registration Code</span>
                <span className="text-sm font-bold font-mono text-gray-600">{patient.code}</span>
              </div>
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">Contact Number</span>
                <span className="text-sm font-bold text-gray-600">+91 90876 54321</span>
              </div>
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">Date of Birth</span>
                <span className="text-sm font-bold text-gray-600">12-AUG-1980 (45 Yrs)</span>
              </div>
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">City / Residence</span>
                <span className="text-sm font-bold text-gray-600">Lucknow, Uttar Pradesh</span>
              </div>
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">Assigned Specialist</span>
                <span className="text-sm font-bold text-gray-600">{patient.assignedDoctor || "Unassigned"}</span>
              </div>
              <div className="border-b border-gray-150 pb-2">
                <span className="text-[10px] text-gray-400 block font-bold">Emergency Contact</span>
                <span className="text-sm font-bold text-gray-600">Preeti Sharma (Spouse)</span>
              </div>
            </div>
          </Card>

          {/* Vitals Snapshot */}
          <Card titleText="Triage Vitals Check" className="border border-gray-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Blood Pressure</span>
                <span className="text-lg font-bold text-gray-600">{patient.vitals?.bp || "--"}</span>
                <span className="text-[9px] text-clinical-green font-bold block mt-1">NORMAL RANGE</span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Heart Rate</span>
                <span className="text-lg font-bold text-gray-600">{patient.vitals?.hr ? `${patient.vitals.hr} bpm` : "--"}</span>
                <span className="text-[9px] text-clinical-green font-bold block mt-1">SINE RHYTHM</span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Temperature</span>
                <span className="text-lg font-bold text-gray-600">{patient.vitals?.temp || "--"}</span>
                <span className="text-[9px] text-clinical-amber font-bold block mt-1">SLIGHT ELEVATION</span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Oxygen SpO2</span>
                <span className="text-lg font-bold text-gray-600">{patient.vitals?.spo2 ? `${patient.vitals.spo2}%` : "--"}</span>
                <span className="text-[9px] text-clinical-green font-bold block mt-1">ADEQUATE PERFUSION</span>
              </div>
            </div>
          </Card>

          {/* Clinical Documents & Diagnostic Uploads */}
          <Card titleText="Linked Diagnostics & Otoscopy Scan Reports" className="border border-gray-300">
            <div className="space-y-3 font-semibold uppercase tracking-wider text-xs">
              <div className="flex justify-between items-center p-3 border border-gray-200 rounded bg-white hover:bg-gray-50">
                <div>
                  <span className="text-gray-600 font-bold block">Left Ear Canal Otoscopy scan.jpg</span>
                  <span className="text-[10px] text-gray-400 block">JPEG scan image • Uploaded via reception desk</span>
                </div>
                <Button variant="secondary" size="sm">PREVIEW</Button>
              </div>

              <div className="flex justify-between items-center p-3 border border-gray-200 rounded bg-white hover:bg-gray-50">
                <div>
                  <span className="text-gray-600 font-bold block">Patient General Health Intake Questionnaire.pdf</span>
                  <span className="text-[10px] text-gray-400 block">PDF file • Compiled check-in record</span>
                </div>
                <Button variant="secondary" size="sm">PREVIEW</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right side: Timeline & Guidelines */}
        <div className="lg:col-span-4 space-y-8">
          <AssessmentTimeline patient={patient} assessment={assessment} />
          
          <Card titleText="residence guidelines" className="border border-gray-300">
            <div className="text-xs text-gray-500 space-y-3 leading-relaxed uppercase font-semibold">
              <p>• Verify active complaint description before prompting AI questioning compiler.</p>
              <p>• Capture specific symptom durations explicitly in the transcript file.</p>
              <p>• Emergency cases require direct supervisor overrides or direct senior review page bypasses.</p>
            </div>
          </Card>
        </div>
      </AssessmentWorkspace>
    </div>
  );
}
