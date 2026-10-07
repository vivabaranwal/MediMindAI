"use client";

import React from "react";
import { AiBriefDto } from "@/types/ai";
import { Section } from "@/store/seniorDoctorStore";
import { riskToAcuity } from "@/lib/risk";
import { RiskBadge } from "./RiskBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";

interface AiBriefPanelProps {
  brief: Section<AiBriefDto>;
  onRegenerate: () => void;
  className?: string;
}

export const AiBriefPanel: React.FC<AiBriefPanelProps> = ({ brief, onRegenerate, className = "" }) => {
  const busy = brief.status === "loading";

  return (
    <Card className={`border border-gray-300 ${className}`}>
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-start border-b border-gray-200 pb-3 gap-2">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">AI CLINICAL BRIEFING</span>
            <h3 className="text-base font-bold text-gray-650 uppercase tracking-tight">Pre-Consultation Brief</h3>
          </div>
          {brief.data && <RiskBadge acuity={riskToAcuity(brief.data.risk_level)} />}
        </div>

        {busy && !brief.data && (
          <div className="flex items-center gap-3 py-4">
            <Spinner />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI is preparing the brief...</span>
          </div>
        )}

        {brief.status === "error" && (
          <Alert type={brief.code === "ai_consent_required" ? "warning" : "error"} titleText="AI brief unavailable">
            {brief.error}
          </Alert>
        )}

        {brief.data && (
          <div className="space-y-3 text-xs">
            <p className="normal-case font-normal text-sm text-gray-650 leading-relaxed bg-gray-50 border border-gray-200 p-3 rounded">
              {brief.data.brief_text}
            </p>

            {brief.data.risk_rationale && (
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">RISK RATIONALE</span>
                <p className="normal-case font-normal text-gray-550 leading-relaxed mt-0.5">{brief.data.risk_rationale}</p>
              </div>
            )}

            {brief.data.red_flags && brief.data.red_flags.length > 0 && (
              <Alert type="error" titleText="Red flags detected by safety rules">
                {brief.data.red_flags.join("; ")}
              </Alert>
            )}

            {brief.data.suggested_questions && brief.data.suggested_questions.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">QUESTIONS YOU MAY WANT TO ASK</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 normal-case font-normal">
                  {brief.data.suggested_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10px] text-gray-400 normal-case font-normal leading-relaxed pt-2 border-t border-gray-150">
              AI-generated draft for clinician review. Not a diagnosis or clinical decision.
              {brief.data.llm_model_used ? ` Model: ${brief.data.llm_model_used}.` : ""}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase tracking-wider" onClick={onRegenerate} disabled={busy}>
            {busy ? "Working..." : brief.status === "error" ? "Retry" : "Regenerate"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
