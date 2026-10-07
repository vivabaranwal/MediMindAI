"use client";

import React, { useState } from "react";
import { JuniorDoctorAssessment } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

interface AssessmentPanelProps {
  assessment?: JuniorDoctorAssessment;
  className?: string;
}

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({ assessment, className = "" }) => {
  const [isQAOpen, setIsQAOpen] = useState(false);

  if (!assessment) {
    return (
      <Card titleText="JUNIOR INTAKE SUMMARY" className={`border border-gray-300 ${className}`}>
        <p className="text-xs text-gray-450 uppercase font-semibold text-center py-8">No junior doctor intake record found for this patient.</p>
      </Card>
    );
  }

  const { summary } = assessment;

  return (
    <div className={`space-y-6 ${className}`}>
      {summary && summary.redFlags.length > 0 && (
        <Alert type="error" titleText="Red flags raised at intake">
          {summary.redFlags.join("; ")}
        </Alert>
      )}

      <Card titleText="JUNIOR CLINICAL SYNTHESIS" className="border border-gray-300">
        <div className="space-y-4 text-xs font-semibold uppercase tracking-wider text-gray-650 text-left">
          <div>
            <span className="text-[9px] text-gray-400 block font-bold">CHIEF PRESENTATION</span>
            <p className="normal-case font-normal text-sm text-gray-650 leading-relaxed mt-1.5 bg-gray-50 border border-gray-200 p-3 rounded">
              &ldquo;{assessment.chiefComplaint || "Not documented"}&rdquo;
            </p>
          </div>

          <div>
            <span className="text-[9px] text-gray-400 block font-bold">CASE SUMMARY</span>
            <p className="normal-case font-normal text-xs text-gray-550 leading-relaxed mt-1 bg-gray-50 border border-gray-200 p-3 rounded">
              {summary ? `${summary.subjective} ${summary.clinicalNotes}`.trim() : "No AI intake summary was compiled for this case."}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <span className="text-[9px] text-gray-400 block font-bold">SYMPTOM TIMELINE</span>
            <p className="normal-case font-normal text-xs text-gray-650 mt-1 leading-relaxed">{summary?.timeline || "Not documented"}</p>
          </div>
        </div>
      </Card>

      <Card titleText="SYMPTOMS ANALYSIS" className="border border-gray-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left font-semibold uppercase tracking-wider text-xs">
          <div>
            <span className="text-[9px] text-clinical-green block font-bold mb-2">IDENTIFIED SYMPTOMS</span>
            <ul className="space-y-1.5">
              {assessment.positives.map((pos, idx) => (
                <li key={idx} className="bg-clinical-green-light/20 text-clinical-green border-l-[3px] border-clinical-green p-2 rounded text-[11px]">
                  {pos}
                </li>
              ))}
              {assessment.positives.length === 0 && <li className="text-gray-400 text-[10px]">None documented.</li>}
            </ul>
          </div>

          <div>
            <span className="text-[9px] text-clinical-red block font-bold mb-2">PERTINENT NEGATIVES</span>
            <ul className="space-y-1.5">
              {assessment.negatives.map((neg, idx) => (
                <li key={idx} className="bg-clinical-red-light/20 text-clinical-red border-l-[3px] border-clinical-red p-2 rounded text-[11px]">
                  {neg}
                </li>
              ))}
              {assessment.negatives.length === 0 && <li className="text-gray-400 text-[10px]">None documented.</li>}
            </ul>
          </div>
        </div>
      </Card>

      <div className="border border-gray-300 rounded-[4px] overflow-hidden">
        <button
          className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
          onClick={() => setIsQAOpen((prev) => !prev)}
          aria-expanded={isQAOpen}
        >
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">INTAKE QUESTIONNAIRE</span>
            <h3 className="text-xs font-bold text-gray-650 uppercase tracking-wider">
              Answered Questions
              <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold">{assessment.questionsAnswered.length} Q&amp;As</span>
            </h3>
          </div>
          <span className={`text-gray-400 text-lg font-light transition-transform duration-200 ${isQAOpen ? "rotate-180" : ""}`}>▾</span>
        </button>

        {isQAOpen && (
          <div className="border-t border-gray-200 px-4 py-4 bg-white">
            {assessment.questionsAnswered.length > 0 ? (
              <div className="space-y-3.5 text-left font-semibold uppercase tracking-wider text-xs">
                {assessment.questionsAnswered.map((q) => (
                  <div key={q.id} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                    <span className="text-[9px] text-gray-400 mb-1 font-bold block">{q.category}</span>
                    <p className="normal-case font-normal text-xs text-gray-650 leading-relaxed">{q.text}</p>
                    <div className="bg-gray-50 border border-gray-200 p-2.5 rounded mt-2 text-clinical-blue text-[11px] font-bold normal-case">
                      Patient response: {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4 font-bold">No answered questions recorded.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
