"use client";

import React, { useState } from "react";
import { Recommendation, SimilarCase, OutcomeStatistic, Patient, JuniorDoctorAssessment } from "@/types/senior-doctor";
import { RecommendationCard } from "./RecommendationCard";
import { PatientInsightChatbot } from "./PatientInsightChatbot";
import { Card } from "@/components/ui/Card";

interface AIIntelligencePanelProps {
  patient: Patient;
  assessment?: JuniorDoctorAssessment;
  recommendations: Recommendation[];
  similarCases: SimilarCase[];
  outcomeStats: OutcomeStatistic[];
  onRecommendationStatusChange: (
    recId: string,
    status: "pending" | "accepted" | "modified" | "rejected",
    modifiedValue?: string
  ) => void;
  className?: string;
}

export const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({
  patient,
  assessment,
  recommendations,
  similarCases,
  outcomeStats,
  onRecommendationStatusChange,
  className = "",
}) => {
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // Filter out Resolution Rate from cohort stats per specification
  const filteredStats = outcomeStats.filter(
    (s) => !s.metricName.toLowerCase().includes("resolution rate")
  );

  const toggleCase = (id: string) => {
    setExpandedCaseId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Patient Insight Chatbot */}
      <PatientInsightChatbot
        patient={patient}
        assessment={assessment}
        recommendations={recommendations}
        similarCases={similarCases}
        outcomeStats={filteredStats}
      />

      {/* 2. Primary Suggestion Box — Unified Differentials + Clinical Orders */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-left">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
              PRIMARY SUGGESTION BOX
            </span>
            <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">
              Differentials, Diagnosis & Interventions
            </h3>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2.5 py-0.5 rounded">
            {recommendations.length} ITEMS
          </span>
        </div>

        <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onStatusChange={(status, modifiedValue) =>
                  onRecommendationStatusChange(rec.id, status, modifiedValue)
                }
              />
            ))
          ) : (
            <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
              No AI suggestions calculated for this patient.
            </p>
          )}
        </div>
      </div>

      {/* 3. Cohort Insights (Resolution Rate excluded) */}
      {filteredStats.length > 0 && (
        <Card className="border border-gray-300">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                COHORT INSIGHTS
              </span>
              <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                AI Outcome Projections
              </h4>
            </div>

            <div className="space-y-4">
              {filteredStats.map((stat, idx) => (
                <div key={idx} className="border-b border-gray-150 pb-3 last:border-0 last:pb-0 text-left font-semibold uppercase tracking-wider text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-450 text-[10px] font-bold block">{stat.metricName}</span>
                    <span className="text-sm font-bold text-clinical-blue">{stat.value}</span>
                  </div>
                  <p className="normal-case font-normal text-xs text-gray-500 mt-1 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 4. Similar Case History — Link-based list with inline expand */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 text-left">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
            COMPARATIVE MODEL
          </span>
          <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">
            Similar Case History
          </h3>
        </div>

        {similarCases.length > 0 ? (
          <div className="space-y-1">
            {similarCases.map((cs) => (
              <div key={cs.id}>
                {/* Clickable case link */}
                <button
                  className="w-full flex justify-between items-center text-left py-2 px-0 group"
                  onClick={() => toggleCase(cs.id)}
                >
                  <span className="font-mono text-xs font-bold text-clinical-blue underline underline-offset-2 group-hover:text-clinical-blue/80 transition-colors">
                    {cs.caseCode}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-clinical-blue-light text-clinical-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {cs.similarityPercent}% MATCH
                    </span>
                    <span className={`text-gray-400 text-sm transition-transform duration-200 ${expandedCaseId === cs.id ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {/* Inline case details */}
                {expandedCaseId === cs.id && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-1 mb-2 space-y-2.5 text-xs text-left font-semibold uppercase tracking-wider text-gray-650 animate-fade-in-up">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold tracking-wider">CLINICAL OUTCOME</span>
                      <p className="normal-case font-normal text-gray-650 leading-relaxed mt-0.5">{cs.outcomeSummary}</p>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold tracking-wider">TREATMENT REGIMEN</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cs.treatmentsUsed.map((t, i) => (
                          <span key={i} className="bg-white border border-gray-300 px-2 py-0.5 rounded text-[10px] font-medium text-gray-550 lowercase">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold tracking-wider">RECOVERY TIME</span>
                        <span className="text-gray-600 font-bold">{cs.recoveryTime}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold tracking-wider">RECURRENCE RATE</span>
                        <span className="text-gray-600 font-bold">{cs.recurrenceRate}</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-gray-200">
                      <span className="text-[9px] text-gray-400 block font-bold tracking-wider">COMPLICATIONS RECORDED</span>
                      <p className="normal-case font-normal text-gray-650 leading-relaxed mt-0.5">{cs.complications}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
            No similar case files resolved.
          </p>
        )}
      </div>
    </div>
  );
};
