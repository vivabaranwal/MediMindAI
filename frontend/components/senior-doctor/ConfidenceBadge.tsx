import React from "react";
import type { Likelihood } from "@/types/ai";

interface LikelihoodBadgeProps {
  likelihood: Likelihood;
  className?: string;
}

const STYLES: Record<Likelihood, { style: string; label: string }> = {
  high: { style: "bg-clinical-green-light text-clinical-green", label: "HIGH LIKELIHOOD" },
  moderate: { style: "bg-clinical-amber-light text-clinical-amber", label: "MODERATE LIKELIHOOD" },
  low: { style: "bg-clinical-red-light text-clinical-red", label: "LOW LIKELIHOOD" },
};

/** Qualitative model likelihood. The model gives no calibrated probability, so none is shown. */
export const ConfidenceBadge: React.FC<LikelihoodBadgeProps> = ({ likelihood, className = "" }) => {
  const { style, label } = STYLES[likelihood];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${style} ${className}`}>
      {label}
    </span>
  );
};
