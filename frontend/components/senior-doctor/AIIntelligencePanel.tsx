"use client";

import React from "react";
import { Recommendation, Patient } from "@/types/senior-doctor";
import { AiBriefDto, SuggestionsDto } from "@/types/ai";
import { Section } from "@/store/seniorDoctorStore";
import { RecommendationCard } from "./RecommendationCard";
import { PatientInsightChatbot } from "./PatientInsightChatbot";
import { AiBriefPanel } from "./AiBriefPanel";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";

interface AIIntelligencePanelProps {
  patient: Patient;
  recommendations: Recommendation[];
  brief: Section<AiBriefDto>;
  suggestions: Section<SuggestionsDto>;
  onRegenerateBrief: () => void;
  onRegenerateSuggestions: () => void;
  onRecommendationStatusChange: (recId: string, status: "pending" | "accepted" | "modified" | "rejected", modifiedValue?: string) => void;
  className?: string;
}

export const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({
  patient,
  recommendations,
  brief,
  suggestions,
  onRegenerateBrief,
  onRegenerateSuggestions,
  onRecommendationStatusChange,
  className = "",
}) => {
  const loading = suggestions.status === "loading";

  return (
    <div className={`space-y-6 ${className}`}>
      <PatientInsightChatbot patient={patient} />

      <AiBriefPanel brief={brief} onRegenerate={onRegenerateBrief} />

      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-left">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">DECISION SUPPORT</span>
            <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">Differentials, Investigations &amp; Options</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2.5 py-0.5 rounded">{recommendations.length} ITEMS</span>
            <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase" onClick={onRegenerateSuggestions} disabled={loading}>
              {loading ? "Working..." : suggestions.status === "error" ? "Retry" : "Regenerate"}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-3">
            <Spinner />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI is analysing the case...</span>
          </div>
        )}

        {suggestions.status === "error" && (
          <Alert type={suggestions.code === "ai_consent_required" ? "warning" : "error"} titleText="Suggestions unavailable">
            {suggestions.error}
          </Alert>
        )}

        <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStatusChange={(status, modifiedValue) => onRecommendationStatusChange(rec.id, status, modifiedValue)}
            />
          ))}
          {!loading && suggestions.status === "ready" && recommendations.length === 0 && (
            <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
              The AI found too little documented information to suggest anything.
            </p>
          )}
        </div>

        {suggestions.status === "ready" && (
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Options for the doctor to consider, generated from the documented case. They are not decisions. Allergy conflicts on medications are
            checked against the patient&apos;s record.
          </p>
        )}
      </div>
    </div>
  );
};
