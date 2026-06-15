import React from "react";

interface ConfidenceBadgeProps {
  confidence: number; // e.g. 94
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, className = "" }) => {
  let style = "bg-clinical-green-light text-clinical-green";
  let label = "HIGH";

  if (confidence < 50) {
    style = "bg-clinical-red-light text-clinical-red";
    label = "LOW";
  } else if (confidence < 80) {
    style = "bg-clinical-amber-light text-clinical-amber";
    label = "MEDIUM";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${style} ${className}`}>
      {label} ({confidence}%)
    </span>
  );
};
