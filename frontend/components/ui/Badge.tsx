import * as React from "react";

export type BadgeVariant = "green" | "amber" | "red" | "maroon" | "gray" | "blue";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ className = "", variant = "gray", children, ...props }) => {
  let styles = "";
  switch (variant) {
    case "green":
      styles = "bg-clinical-green-light text-clinical-green";
      break;
    case "amber":
      styles = "bg-clinical-amber-light text-clinical-amber";
      break;
    case "red":
      styles = "bg-clinical-red-light text-clinical-red";
      break;
    case "maroon":
      styles = "bg-clinical-maroon-light text-clinical-maroon";
      break;
    case "gray":
      styles = "bg-gray-200 text-gray-500";
      break;
    case "blue":
      styles = "bg-clinical-blue-light text-clinical-blue";
      break;
  }

  const labelMap: Record<string, string> = {
    green: "Low Acuity",
    amber: "Moderate",
    red: "High Acuity",
    maroon: "Critical / Trauma",
    gray: "Waiting",
    blue: "In Progress"
  };

  const content = typeof children === "string" && labelMap[children.toLowerCase()] 
    ? labelMap[children.toLowerCase()] 
    : children;

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-[4px] uppercase tracking-wide border-none ${styles} ${className}`}
      {...props}
    >
      {content}
    </span>
  );
};

Badge.displayName = "Badge";
