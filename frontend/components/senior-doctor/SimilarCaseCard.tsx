import React from "react";
import { SimilarCase } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";

interface SimilarCaseCardProps {
  caseRecord: SimilarCase;
  className?: string;
}

export const SimilarCaseCard: React.FC<SimilarCaseCardProps> = ({ caseRecord, className = "" }) => {
  return (
    <Card className={`border border-gray-200 bg-gray-50/50 p-4 rounded-[4px] ${className}`}>
      <div className="space-y-3">
        {/* Header: Case ID & Similarity */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="font-mono text-xs font-bold text-gray-500">{caseRecord.caseCode}</span>
          <span className="bg-clinical-blue-light text-clinical-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            {caseRecord.similarityPercent}% SIMILARITY
          </span>
        </div>

        {/* Clinical Outcome Details */}
        <div className="space-y-2 text-xs uppercase font-semibold text-gray-650">
          <div>
            <span className="text-[9px] text-gray-400 block font-bold tracking-wider">CLINICAL OUTCOME</span>
            <p className="normal-case font-normal text-gray-650 leading-relaxed">{caseRecord.outcomeSummary}</p>
          </div>

          <div>
            <span className="text-[9px] text-gray-400 block font-bold tracking-wider">TREATMENT REGIMEN</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {caseRecord.treatmentsUsed.map((t, i) => (
                <span key={i} className="bg-white border border-gray-300 px-2 py-0.5 rounded text-[10px] font-medium text-gray-550 lowercase">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200 mt-1">
            <div>
              <span className="text-[9px] text-gray-400 block font-bold tracking-wider">RECOVERY TIME</span>
              <span className="text-gray-600 font-bold">{caseRecord.recoveryTime}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 block font-bold tracking-wider">RECURRENCE RATE</span>
              <span className="text-gray-600 font-bold">{caseRecord.recurrenceRate}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-gray-200">
            <span className="text-[9px] text-gray-400 block font-bold tracking-wider">COMPLICATIONS RECORDED</span>
            <p className="normal-case font-normal text-gray-650 leading-relaxed mt-0.5">{caseRecord.complications}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
