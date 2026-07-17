"use client";

import React, { useState, useEffect } from "react";
import { JuniorDoctorAssessment } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/LoadingState";

interface AssessmentPanelProps {
  assessment?: JuniorDoctorAssessment;
  className?: string;
  isLoading?: boolean;
}

/**
 * Generates a concise AI-synthesised case summary from the junior doctor assessment data.
 */
function generateCaseSummary(assessment: JuniorDoctorAssessment): string {
  const answeredQs = (assessment.questionsAnswered || []).filter((q) => q.answer);
  const qaSummary = answeredQs
    .map((q) => `${q.category}: "${q.answer}"`)
    .join("; ");

  return (
    `Patient presented with: "${assessment.chiefComplaint}". ` +
    `${assessment.notes} ` +
    (qaSummary ? `Key Q&A findings — ${qaSummary}.` : "No Q&A data recorded.")
  );
}

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({ assessment, className = "", isLoading }) => {
  const [isQAOpen, setIsQAOpen] = useState(false);

  // Circuit Breaker: if isLoading hangs > 5s, transition to 'Manual Entry Required' state
  // This prevents the UI deadlock when the SOAP AI generation fails or the AI engine times out.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && timedOut) {
    return (
      <Card titleText="JUNIOR CLINICAL SYNTHESIS" className={`border border-amber-300 ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            ⚠ Manual Entry Required
          </span>
          <p className="text-[11px] text-gray-400 text-center max-w-xs leading-relaxed">
            AI intake data could not be synchronized within 5 seconds. The AI engine may be unavailable or the SOAP note has not yet been generated. Proceed with manual SOAP documentation.
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading && !timedOut) {
    return (
      <Card titleText="JUNIOR CLINICAL SYNTHESIS" className={`border border-gray-300 ${className}`}>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Spinner />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Synchronizing Intake Data...
          </span>
        </div>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card titleText="JUNIOR INTAKE SUMMARY" className={`border border-gray-300 ${className}`}>
        <p className="text-xs text-gray-450 uppercase font-semibold text-center py-8">
          No active junior doctor intake record found for this patient.
        </p>
      </Card>
    );
  }

  const caseSummary = generateCaseSummary(assessment);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Primary Intake Notes */}
      <Card titleText="JUNIOR CLINICAL SYNTHESIS" className="border border-gray-300">
        <div className="space-y-4 text-xs font-semibold uppercase tracking-wider text-gray-650 text-left">
          <div>
            <span className="text-[9px] text-gray-400 block font-bold">CHIEF PRESENTATION</span>
            <p className="normal-case font-normal text-sm text-gray-650 leading-relaxed mt-1.5 bg-gray-50 border border-gray-200 p-3 rounded">
              &ldquo;{assessment.chiefComplaint}&rdquo;
            </p>
          </div>

          <div>
            <span className="text-[9px] text-gray-400 block font-bold">CLINICAL CASE SUMMARY</span>
            <p className="normal-case font-normal text-xs text-gray-550 leading-relaxed mt-1 bg-gray-50 border border-gray-200 p-3 rounded">
              {caseSummary}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <span className="text-[9px] text-gray-400 block font-bold">SYMPTOM TIMELINE</span>
            <p className="normal-case font-normal text-xs text-gray-650 mt-1 leading-relaxed">
              {assessment.timeline}
            </p>
          </div>
        </div>
      </Card>

      {/* Slices for Positives and Negatives */}
      <Card titleText="DIFFERENTIAL SYMPTOMS ANALYSIS" className="border border-gray-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left font-semibold uppercase tracking-wider text-xs">
          <div>
            <span className="text-[9px] text-clinical-green block font-bold mb-2">IDENTIFIED SYMPTOMS</span>
            <ul className="space-y-1.5">
              {Array.isArray(assessment.positives) ? (
                <>
                  {assessment.positives.map((pos, idx) => (
                    <li key={idx} className="bg-clinical-green-light/20 text-clinical-green border-l-[3px] border-clinical-green p-2 rounded text-[11px]">
                      {pos}
                    </li>
                  ))}
                  {assessment.positives.length === 0 && (
                    <li className="text-gray-400 text-[10px]">No active markers.</li>
                  )}
                </>
              ) : (
                <li className="text-gray-400 text-[10px]">No symptoms recorded.</li>
              )}
            </ul>
          </div>

          <div>
            <span className="text-[9px] text-clinical-red block font-bold mb-2">EXCLUDED NEGATIVES</span>
            <ul className="space-y-1.5">
              {Array.isArray(assessment.negatives) ? (
                <>
                  {assessment.negatives.map((neg, idx) => (
                    <li key={idx} className="bg-clinical-red-light/20 text-clinical-red border-l-[3px] border-clinical-red p-2 rounded text-[11px]">
                      {neg}
                    </li>
                  ))}
                  {assessment.negatives.length === 0 && (
                    <li className="text-gray-400 text-[10px]">No exclusions.</li>
                  )}
                </>
              ) : (
                <li className="text-gray-400 text-[10px]">No exclusions recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Clinical Question Responses — Collapsible Accordion */}
      <div className="border border-gray-300 rounded-[4px] overflow-hidden">
        {/* Accordion Header */}
        <button
          className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
          onClick={() => setIsQAOpen((prev) => !prev)}
          aria-expanded={isQAOpen}
        >
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
              INTAKE QUESTIONNAIRE
            </span>
            <h3 className="text-xs font-bold text-gray-650 uppercase tracking-wider">
              Completed Diagnostic Questionnaire
              <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold">
                {assessment.questionsAnswered?.length ?? 0} Q&As
              </span>
            </h3>
          </div>
          <span className={`text-gray-400 text-lg font-light transition-transform duration-200 ${isQAOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        {/* Accordion Body */}
        {isQAOpen && (
          <div className="border-t border-gray-200 px-4 py-4 bg-white">
            {assessment.questionsAnswered && assessment.questionsAnswered.length > 0 ? (
              <div className="space-y-3.5 text-left font-semibold uppercase tracking-wider text-xs">
                {assessment.questionsAnswered.map((q) => (
                  <div key={q.id} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-[9px] text-gray-400 mb-1 font-bold">
                      <span>{q.category}</span>
                      <span>ID: {q.id}</span>
                    </div>
                    <p className="normal-case font-normal text-xs text-gray-650 leading-relaxed">
                      {q.text}
                    </p>
                    <div className="bg-gray-50 border border-gray-200 p-2.5 rounded mt-2 text-clinical-blue text-[11px] font-bold">
                      PATIENT RESPONSE: {q.answer || "[NO RESPONSE]"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4 font-bold">
                No query history recorded.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
