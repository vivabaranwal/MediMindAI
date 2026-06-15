"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { PatientHeader } from "@/components/junior-doctor/PatientHeader";
import { AssessmentWorkspace } from "@/components/junior-doctor/AssessmentWorkspace";
import { QuestionCard } from "@/components/junior-doctor/QuestionCard";
import { ProgressTracker } from "@/components/junior-doctor/ProgressTracker";
import { SummaryService } from "@/services/summary.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";

interface QuestionsPageProps {
  params: {
    id: string;
  };
}

export default function QuestionsPage({ params }: QuestionsPageProps) {
  const router = useRouter();
  const {
    patients,
    assessments,
    updateQuestionStatus,
    updateQuestionText,
    answerQuestion,
    setSummary,
    resetActiveAssessment,
  } = useJuniorDoctorStore();

  const patientId = Number(params.id);
  const patient = patients.find((p) => p.id === patientId);
  const assessment = assessments[patientId];
  const [compiling, setCompiling] = useState(false);

  if (!patient || !assessment) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-500 uppercase">Assessment Not Found</h2>
        <p className="text-sm text-gray-450">This patient session has not been initiated yet.</p>
        <Link href={`/junior-doctor/patient/${patientId}`}>
          <Button variant="primary">Start Assessment</Button>
        </Link>
      </div>
    );
  }

  const handleCompileSummary = async () => {
    setCompiling(true);
    try {
      const compiled = await SummaryService.compileSummary(
        assessment.chiefComplaint,
        assessment.questions,
        patient.acuity
      );
      setSummary(patientId, compiled);
      router.push(`/junior-doctor/patient/${patientId}/summary`);
    } catch (err) {
      console.error(err);
    } finally {
      setCompiling(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset this assessment session? All draft answers will be cleared.")) {
      resetActiveAssessment(patientId);
      router.push(`/junior-doctor/patient/${patientId}`);
    }
  };

  // Validation: at least one accepted, and all accepted must be answered
  const acceptedQuestions = assessment.questions.filter((q) => q.status === "accepted");
  const answeredCount = acceptedQuestions.filter((q) => q.answer && q.answer.trim() !== "").length;
  const isCompileEnabled = acceptedQuestions.length > 0 && answeredCount === acceptedQuestions.length;

  if (compiling) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center space-y-4">
        <Spinner />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          AI COMPILER SYNTHESIZING CLINICAL BRIEF...
        </p>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold text-center">
          Structuring Subjective complaint history, timeline markers, and clinical negatives list
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <PatientHeader patient={patient} backHref={`/junior-doctor/patient/${patientId}`} />

      {/* Grid Layout: Left sidebar (4 cols), Center checklist (5 cols), Right tracker (3 cols) */}
      <AssessmentWorkspace>
        {/* Left Area (4 cols) - Patient Demographics & Vitals */}
        <div className="lg:col-span-4 space-y-6">
          <Card titleText="Active Intake Overview" className="border border-gray-300">
            <div className="space-y-4 text-xs font-semibold uppercase tracking-wider text-gray-650">
              <div>
                <span className="text-[10px] text-gray-400 block font-bold">CHIEF COMPLAINT</span>
                <p className="text-sm font-semibold text-gray-650 normal-case bg-gray-50 border border-gray-200 p-3 rounded leading-relaxed mt-1">
                  &ldquo;{assessment.chiefComplaint}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-150">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Blood Pressure</span>
                  <span className="text-sm font-bold text-gray-600">{patient.vitals?.bp || "--"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Heart Rate</span>
                  <span className="text-sm font-bold text-gray-600">{patient.vitals?.hr ? `${patient.vitals.hr} bpm` : "--"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Temperature</span>
                  <span className="text-sm font-bold text-gray-600">{patient.vitals?.temp || "--"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Oxygen SpO2</span>
                  <span className="text-sm font-bold text-gray-600">{patient.vitals?.spo2 ? `${patient.vitals.spo2}%` : "--"}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Captured answers list */}
          <Card titleText="Captured Responses" className="border border-gray-300">
            {acceptedQuestions.length === 0 ? (
              <p className="text-xs text-gray-450 uppercase font-semibold text-center py-4">
                No questions accepted yet.
              </p>
            ) : (
              <div className="space-y-3 font-semibold text-xs uppercase tracking-wider text-gray-650">
                {acceptedQuestions.map((q) => (
                  <div key={q.id} className="border-b border-gray-150 pb-2 last:border-0 last:pb-0">
                    <span className="text-[9px] text-gray-400 block font-bold">{q.category}</span>
                    <p className="text-gray-650 truncate mt-0.5 normal-case font-normal">{q.text}</p>
                    <span className={`text-[10px] font-bold block mt-1 ${q.answer ? "text-clinical-blue" : "text-clinical-amber"}`}>
                      ANSWER: {q.answer || "[PENDING RESPONSE]"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Button variant="secondary" onClick={handleReset} className="w-full text-clinical-red hover:bg-clinical-red-light border-clinical-red/20 font-bold uppercase tracking-wider text-xs">
            RESET ASSESSMENT DRAFT
          </Button>
        </div>

        {/* Center Panel (5 cols) - Interactive AI Question Checklist */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
              AI Suggested Questions
            </h3>
            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded">
              {assessment.questions.length} TOTAL
            </span>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {assessment.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onAccept={() => updateQuestionStatus(patientId, q.id, "accepted")}
                onReject={() => updateQuestionStatus(patientId, q.id, "rejected")}
                onUpdateText={(text) => updateQuestionText(patientId, q.id, text)}
                onAnswerChange={(ans) => answerQuestion(patientId, q.id, ans)}
              />
            ))}
          </div>
        </div>

        {/* Right Panel (3 cols) - Progress Tracker & Actions */}
        <div className="lg:col-span-3 space-y-6">
          <ProgressTracker questions={assessment.questions} />

          <Button
            variant="primary"
            className="w-full tracking-wider font-bold py-3 text-xs"
            onClick={handleCompileSummary}
            disabled={!isCompileEnabled}
          >
            COMPILE CASE SUMMARY →
          </Button>

          <Card titleText="residence guidelines" className="border border-gray-300">
            <div className="text-xs font-semibold text-gray-550 space-y-2 leading-relaxed uppercase">
              <p>• Accept questions that cover symptom boundaries.</p>
              <p>• Reject questions irrelevant to this specific case presentation.</p>
              <p>• Edit the question phrasing if needed to suit clinical language before ask.</p>
            </div>
          </Card>
        </div>
      </AssessmentWorkspace>
    </div>
  );
}
