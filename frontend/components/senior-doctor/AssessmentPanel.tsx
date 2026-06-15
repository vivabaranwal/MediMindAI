import React from "react";
import { JuniorDoctorAssessment } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";

interface AssessmentPanelProps {
  assessment?: JuniorDoctorAssessment;
  className?: string;
}

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({ assessment, className = "" }) => {
  if (!assessment) {
    return (
      <Card titleText="JUNIOR INTAKE SUMMARY" className={`border border-gray-300 ${className}`}>
        <p className="text-xs text-gray-450 uppercase font-semibold text-center py-8">
          No active junior doctor intake record found for this patient.
        </p>
      </Card>
    );
  }

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
            <span className="text-[9px] text-gray-400 block font-bold">INTAKE RESIDENT NOTES</span>
            <p className="normal-case font-normal text-xs text-gray-550 leading-relaxed mt-1">
              {assessment.notes}
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
              {assessment.positives.map((pos, idx) => (
                <li key={idx} className="bg-clinical-green-light/20 text-clinical-green border-l-[3px] border-clinical-green p-2 rounded text-[11px]">
                  {pos}
                </li>
              ))}
              {assessment.positives.length === 0 && (
                <li className="text-gray-400 text-[10px]">No active markers.</li>
              )}
            </ul>
          </div>

          <div>
            <span className="text-[9px] text-clinical-red block font-bold mb-2">EXCLUDED NEGATIVES</span>
            <ul className="space-y-1.5">
              {assessment.negatives.map((neg, idx) => (
                <li key={idx} className="bg-clinical-red-light/20 text-clinical-red border-l-[3px] border-clinical-red p-2 rounded text-[11px]">
                  {neg}
                </li>
              ))}
              {assessment.negatives.length === 0 && (
                <li className="text-gray-400 text-[10px]">No exclusions.</li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Clinical Question Responses List */}
      <Card titleText="COMPLETED DIAGNOSTIC QUESTIONNAIRE" className="border border-gray-300">
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
      </Card>
    </div>
  );
};
