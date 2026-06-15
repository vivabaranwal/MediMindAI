import React from "react";
import { Question } from "@/types/junior-doctor";

interface ProgressTrackerProps {
  questions: Question[];
  className?: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ questions, className = "" }) => {
  const total = questions.length;
  const accepted = questions.filter((q) => q.status === "accepted").length;
  const rejected = questions.filter((q) => q.status === "rejected").length;
  const answered = questions.filter((q) => q.status === "accepted" && q.answer && q.answer.trim() !== "").length;
  
  // Calculate completion percentage: questions answered out of total accepted
  const completionPercent = accepted > 0 ? Math.round((answered / accepted) * 100) : 0;

  return (
    <div className={`bg-white border border-gray-300 p-6 rounded-[4px] space-y-4 ${className}`}>
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">
          ASSESSMENT COVERAGE
        </span>
        <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">
          Progress Tracker
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
          <span className="text-gray-450">COMPLETED RESPONSES</span>
          <span className="text-clinical-blue">{completionPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
          <div
            className="bg-clinical-blue h-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Numeric metrics list */}
      <div className="grid grid-cols-2 gap-4 pt-3 text-xs uppercase font-semibold text-gray-650">
        <div className="border-r border-gray-200 pr-2">
          <span className="text-[10px] text-gray-400 block font-bold tracking-wider">SUGGESTED</span>
          <span className="text-base font-bold text-gray-600">{total}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block font-bold tracking-wider">ACCEPTED</span>
          <span className="text-base font-bold text-gray-600">{accepted}</span>
        </div>
        <div className="border-r border-gray-200 pr-2">
          <span className="text-[10px] text-gray-400 block font-bold tracking-wider">REJECTED</span>
          <span className="text-base font-bold text-gray-600">{rejected}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block font-bold tracking-wider">ANSWERED</span>
          <span className="text-base font-bold text-clinical-green">{answered} / {accepted}</span>
        </div>
      </div>

      {/* Status recommendations */}
      <div className="pt-2 border-t border-gray-150 text-[11px] text-gray-450 leading-relaxed font-semibold">
        {answered === accepted && accepted > 0 ? (
          <p className="text-clinical-green font-bold">
            ✓ COMPLETED. ALL ACCEPTED QUESTIONS HAVE RESPONSES. READY TO RUN CASE SUMMARY COMPILER.
          </p>
        ) : accepted === 0 ? (
          <p className="text-clinical-amber">
            ⚠️ PLEASE ACCEPT AT LEAST ONE CLINICAL QUESTION FROM SUGGESTIONS LIST.
          </p>
        ) : (
          <p>
            ℹ️ RESPOND TO ALL ACCEPTED QUESTIONS ABOVE. DRAFT STATE IS FULLY AUTO-SAVED.
          </p>
        )}
      </div>
    </div>
  );
};
