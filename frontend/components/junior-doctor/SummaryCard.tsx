import React from "react";
import { CaseSummary } from "@/types/junior-doctor";
import { RiskBadge } from "./RiskBadge";

interface SummaryCardProps {
  summary: CaseSummary;
  onUpdateSummaryField?: (field: keyof CaseSummary, value: string | string[]) => void;
  readOnly?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  onUpdateSummaryField,
  readOnly = false,
}) => {
  return (
    <div className="bg-white border border-gray-300 rounded-[4px] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 gap-2">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
            CLINICAL SOAP REPORT
          </span>
          <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">
            Case Assessment Brief
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-450 uppercase tracking-wider">AI ACUITY RECOMMENDATION:</span>
          <RiskBadge acuity={summary.riskAssessment} />
        </div>
      </div>

      <div className="space-y-6 text-left">
        {/* Subjective */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            SUBJECTIVE COMPLAINT
          </label>
          {readOnly ? (
            <p className="text-sm text-gray-650 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200 font-medium">
              {summary.subjective}
            </p>
          ) : (
            <textarea
              value={summary.subjective}
              onChange={(e) => onUpdateSummaryField?.("subjective", e.target.value)}
              className="w-full text-sm text-gray-600 p-3 bg-white border border-gray-300 rounded focus:outline-none focus:border-clinical-blue"
              rows={2}
            />
          )}
        </div>

        {/* Timeline */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            CHRONOLOGY & PROGRESSION TIMELINE
          </label>
          {readOnly ? (
            <p className="text-sm text-gray-650 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200 font-medium">
              {summary.timeline}
            </p>
          ) : (
            <textarea
              value={summary.timeline}
              onChange={(e) => onUpdateSummaryField?.("timeline", e.target.value)}
              className="w-full text-sm text-gray-600 p-3 bg-white border border-gray-300 rounded focus:outline-none focus:border-clinical-blue"
              rows={2}
            />
          )}
        </div>

        {/* Symptoms & Negatives Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[11px] font-bold text-clinical-green uppercase tracking-widest block mb-2">
              IDENTIFIED POSITIVE SYMPTOMS
            </label>
            <ul className="space-y-2">
              {summary.symptoms.map((s, idx) => (
                <li key={idx} className="text-xs font-semibold text-gray-600 bg-clinical-green-light/20 border-l-[3px] border-clinical-green p-2.5 rounded-[2px]">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-[11px] font-bold text-clinical-red uppercase tracking-widest block mb-2">
              RELEVANT DIFFERENTIAL NEGATIVES
            </label>
            <ul className="space-y-2">
              {summary.negatives.map((n, idx) => (
                <li key={idx} className="text-xs font-semibold text-gray-600 bg-clinical-red-light/20 border-l-[3px] border-clinical-red p-2.5 rounded-[2px]">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clinical Notes Summary */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            CLINICAL EVALUATION SYNTHESIS
          </label>
          {readOnly ? (
            <pre className="text-sm text-gray-650 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200 font-medium font-sans whitespace-pre-wrap">
              {summary.clinicalNotes}
            </pre>
          ) : (
            <textarea
              value={summary.clinicalNotes}
              onChange={(e) => onUpdateSummaryField?.("clinicalNotes", e.target.value)}
              className="w-full text-sm text-gray-600 p-3 bg-white border border-gray-300 rounded font-sans focus:outline-none focus:border-clinical-blue"
              rows={5}
            />
          )}
        </div>
      </div>
    </div>
  );
};
