import React from "react";
import { Recommendation, SimilarCase, OutcomeStatistic } from "@/types/senior-doctor";
import { RecommendationCard } from "./RecommendationCard";
import { SimilarCaseCard } from "./SimilarCaseCard";
import { OutcomeStatsCard } from "./OutcomeStatsCard";

interface AIIntelligencePanelProps {
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
  recommendations,
  similarCases,
  outcomeStats,
  onRecommendationStatusChange,
  className = "",
}) => {
  const differentials = recommendations.filter((r) => r.type === "diagnosis");
  const nonDifferentials = recommendations.filter((r) => r.type !== "diagnosis");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. AI Differentials List */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-left">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
              PRIMARY SUGGESTIONS
            </span>
            <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">
              Differentials & Diagnosis
            </h3>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2.5 py-0.5 rounded">
            {differentials.length} PATHS
          </span>
        </div>

        <div className="space-y-3.5">
          {differentials.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStatusChange={(status, modifiedValue) =>
                onRecommendationStatusChange(rec.id, status, modifiedValue)
              }
            />
          ))}
          {differentials.length === 0 && (
            <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
              No diagnosis suggestions calculated.
            </p>
          )}
        </div>
      </div>

      {/* 2. Suggested Investigations & Therapeutics */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 text-left">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
            CLINICAL ORDERS
          </span>
          <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">
            Diagnostics & Interventions
          </h3>
        </div>

        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {nonDifferentials.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStatusChange={(status, modifiedValue) =>
                onRecommendationStatusChange(rec.id, status, modifiedValue)
              }
            />
          ))}
          {nonDifferentials.length === 0 && (
            <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
              No orders suggested.
            </p>
          )}
        </div>
      </div>

      {/* 3. Outcome Projections */}
      <OutcomeStatsCard statistics={outcomeStats} />

      {/* 4. Similar Case Histories */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3 text-left">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
            COMPARATIVE MODEL
          </span>
          <h3 className="font-bold text-base text-gray-655 uppercase tracking-wider">
            Similar Case History
          </h3>
        </div>

        <div className="space-y-3.5">
          {similarCases.map((cs) => (
            <SimilarCaseCard key={cs.id} caseRecord={cs} />
          ))}
          {similarCases.length === 0 && (
            <p className="text-xs text-gray-450 uppercase text-center py-4 font-semibold">
              No similar case files resolved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
