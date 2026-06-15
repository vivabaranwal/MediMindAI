import React from "react";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { AcuityLevel } from "@/types/junior-doctor";

interface RiskBadgeProps {
  acuity: AcuityLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ acuity, className = "" }) => {
  let variant: BadgeVariant = "gray";
  let label = "Unknown Acuity";

  switch (acuity) {
    case "low acuity":
      variant = "green";
      label = "Low Acuity";
      break;
    case "moderate acuity":
      variant = "amber";
      label = "Moderate Acuity";
      break;
    case "high acuity":
      variant = "red";
      label = "High Acuity";
      break;
    case "emergent acuity":
      variant = "maroon";
      label = "Emergent Acuity";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
