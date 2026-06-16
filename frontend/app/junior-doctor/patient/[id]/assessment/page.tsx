"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { PatientHeader } from "@/components/junior-doctor/PatientHeader";
import { AssessmentWorkspace } from "@/components/junior-doctor/AssessmentWorkspace";
import { AssessmentTimeline } from "@/components/junior-doctor/AssessmentTimeline";
import { AnswerInput } from "@/components/junior-doctor/AnswerInput";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuestionService } from "@/services/question.service";
import { Spinner } from "@/components/ui/LoadingState";

interface StartAssessmentPageProps {
  params: {
    id: string;
  };
}

export default function StartAssessmentPage({ params }: StartAssessmentPageProps) {
  const router = useRouter();
  const { patients, assessments, startAssessment } = useJuniorDoctorStore();
  
  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];

  const [chiefComplaint, setChiefComplaint] = useState(patient?.chiefComplaint || "");
  const [bp, setBp] = useState(patient?.vitals?.bp || "");
  const [hr, setHr] = useState(patient?.vitals?.hr?.toString() || "");
  const [temp, setTemp] = useState(patient?.vitals?.temp || "");
  const [spo2, setSpo2] = useState(patient?.vitals?.spo2?.toString() || "");
  const [generating, setGenerating] = useState(false);

  if (!patient) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Patient Record Not Found</h2>
        <Link href="/junior-doctor/dashboard">
          <Button variant="secondary" className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) return;

    setGenerating(true);
    try {
      const questions = await QuestionService.generateQuestions(chiefComplaint);
      startAssessment(patientId, chiefComplaint, questions, {
        bp: bp || undefined,
        hr: hr ? parseInt(hr, 10) : undefined,
        temp: temp || undefined,
        spo2: spo2 ? parseInt(spo2, 10) : undefined,
      });
      router.push(`/junior-doctor/patient/${patientId}/questions`);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center space-y-4">
        <Spinner />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          AI ENGINE COMPILING RELEVANT DIAGNOSTIC QUESTIONS...
        </p>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold text-center">
          Mapping symptom ontology and building active checklist stack
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader patient={patient} backHref={`/junior-doctor/patient/${patientId}`} />

      <AssessmentWorkspace>
        {/* Left Side: Intake Form */}
        <div className="lg:col-span-8">
          <Card titleText="Clinical Intake Assessment" className="border border-gray-300">
            <form onSubmit={handleGenerateQuestions} className="space-y-6">
              <div>
                <p className="text-xs text-gray-450 uppercase font-semibold leading-relaxed mb-4">
                  Please record the patient&apos;s primary presenting symptom cluster or chief complaint below. 
                  You may use the secure voice dictation scanner to transcribe spoken notes.
                </p>
                
                <AnswerInput
                  label="PRESENTING SYMPTOMS & CLINICAL COMPLAINT"
                  value={chiefComplaint}
                  onChange={setChiefComplaint}
                  placeholder="Record patient complaints, symptoms, pain duration, and secondary concerns..."
                  required
                  rows={6}
                  dictationSample="Patient reports left side earache lasting 3 days. Notes localized throbbing pain, sleep interruption, and subjective fever yesterday evening. Denies any ear drainage or cold symptoms."
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                  Patient Triage Vitals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    label="Blood Pressure"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="e.g. 120/80"
                  />
                  <Input
                    label="Heart Rate (bpm)"
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(e.target.value)}
                    placeholder="e.g. 72"
                  />
                  <Input
                    label="Temperature"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder="e.g. 98.6 °F"
                  />
                  <Input
                    label="Oxygen Saturation (%)"
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="e.g. 98"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Link href={`/junior-doctor/patient/${patientId}`}>
                  <Button type="button" variant="secondary">
                    CANCEL
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!chiefComplaint.trim()}
                  className="font-bold tracking-wider"
                >
                  GENERATE DIAGNOSTIC QUESTIONS →
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: Timeline Info */}
        <div className="lg:col-span-4 space-y-6">
          <AssessmentTimeline patient={patient} assessment={assessment} />
          
          <Card titleText="Intake Protocol" className="border border-gray-300">
            <div className="text-xs font-semibold text-gray-500 space-y-3 leading-relaxed uppercase">
              <p>1. Record presenting symptom details with durations explicitly.</p>
              <p>2. Trigger AI compiler to receive specific clinical questionnaires mapped to the symptoms.</p>
              <p>3. Complete all accepted screening questions to compile the handoff SOAP summary.</p>
            </div>
          </Card>
        </div>
      </AssessmentWorkspace>
    </div>
  );
}
