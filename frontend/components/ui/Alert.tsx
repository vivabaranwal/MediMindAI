import * as React from "react";

export type AlertType = "success" | "warning" | "error" | "info";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  titleText?: string;
}

export const Alert: React.FC<AlertProps> = ({ className = "", type = "info", titleText, children, ...props }) => {
  let styles = "";
  switch (type) {
    case "success":
      styles = "border-l-4 border-clinical-green bg-[#F0F8F4] text-clinical-green";
      break;
    case "warning":
      styles = "border-l-4 border-clinical-amber bg-[#FDF8F0] text-clinical-amber";
      break;
    case "error":
      styles = "border-l-4 border-clinical-red bg-[#FDF4F4] text-clinical-red";
      break;
    case "info":
      styles = "border-l-4 border-clinical-blue bg-[#F0EDFF] text-clinical-blue";
      break;
  }

  return (
    <div
      className={`p-4 rounded-[4px] text-base font-normal space-y-1 ${styles} ${className}`}
      {...props}
    >
      {titleText && (
        <div className="font-semibold uppercase tracking-wider text-xs">
          {titleText}
        </div>
      )}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
};

Alert.displayName = "Alert";
