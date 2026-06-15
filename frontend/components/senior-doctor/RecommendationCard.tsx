import React, { useState } from "react";
import { Recommendation } from "@/types/senior-doctor";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Button } from "@/components/ui/Button";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange: (status: "pending" | "accepted" | "modified" | "rejected", modifiedValue?: string) => void;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onStatusChange,
  className = "",
}) => {
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedText, setModifiedText] = useState(recommendation.modifiedValue || recommendation.title);

  const handleSaveModification = () => {
    onStatusChange("modified", modifiedText);
    setIsModifying(false);
  };

  const getBorderColor = () => {
    switch (recommendation.status) {
      case "accepted":
        return "border-clinical-green bg-clinical-green-light/5 shadow-sm";
      case "rejected":
        return "border-clinical-red bg-clinical-red-light/5 opacity-60";
      case "modified":
        return "border-clinical-blue bg-clinical-blue-light/5 shadow-sm";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getTypeLabel = () => {
    switch (recommendation.type) {
      case "diagnosis":
        return "Differential Diagnosis";
      case "investigation":
        return "Suggested Investigation";
      case "medication":
        return "Suggested Pharmacotherapy";
      case "treatment":
        return "Suggested Treatment Plan";
      case "procedure":
        return "Suggested Procedure";
      case "followup":
        return "Suggested Follow-Up";
      default:
        return "Recommendation";
    }
  };

  return (
    <div className={`border rounded-[4px] p-4 transition-all duration-150 text-left ${getBorderColor()} ${className}`}>
      <div className="flex justify-between items-start gap-4">
        {/* Category & Confidence Badge */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            {getTypeLabel()}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded ${
                recommendation.status === "accepted" ? "bg-clinical-green text-white" :
                recommendation.status === "rejected" ? "bg-clinical-red text-white" :
                recommendation.status === "modified" ? "bg-clinical-blue text-white" :
                "bg-gray-150 text-gray-500"
              }`}
            >
              {recommendation.status}
            </span>
            <ConfidenceBadge confidence={recommendation.confidence} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {recommendation.status !== "accepted" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] font-bold uppercase"
              onClick={() => onStatusChange("accepted")}
            >
              Accept
            </Button>
          )}

          {recommendation.status !== "modified" && !isModifying && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] font-bold uppercase"
              onClick={() => setIsModifying(true)}
            >
              Modify
            </Button>
          )}

          {recommendation.status !== "rejected" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] font-bold uppercase text-clinical-red border-clinical-red/20 hover:bg-clinical-red-light"
              onClick={() => onStatusChange("rejected")}
            >
              Reject
            </Button>
          )}
        </div>
      </div>

      {/* Title & Details */}
      <div className="mt-3">
        {isModifying ? (
          <div className="space-y-2">
            <input
              type="text"
              value={modifiedText}
              onChange={(e) => setModifiedText(e.target.value)}
              className="w-full text-xs font-semibold text-gray-650 p-2 bg-white border border-gray-300 rounded focus:outline-none focus:border-clinical-blue"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsModifying(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveModification}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wide ${
              recommendation.status === "rejected" ? "line-through text-gray-400" : "text-gray-650"
            }`}>
              {recommendation.status === "modified" && recommendation.modifiedValue
                ? recommendation.modifiedValue
                : recommendation.title}
            </h4>
            <p className={`text-xs text-gray-500 mt-1 leading-relaxed ${
              recommendation.status === "rejected" ? "line-through opacity-50" : ""
            }`}>
              {recommendation.detail}
            </p>
          </div>
        )}
      </div>

      {/* Clinical Evidence Section */}
      <div className="mt-3 pt-2.5 border-t border-gray-150/70 text-[10px] font-semibold uppercase tracking-wider text-gray-450">
        <span className="text-gray-400 font-bold block mb-0.5">Clinical Rationale Evidence</span>
        <p className="normal-case font-normal text-gray-500 leading-normal">
          {recommendation.evidence}
        </p>
      </div>
    </div>
  );
};
