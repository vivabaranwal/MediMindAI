import React from "react";

interface ClinicalReviewLayoutProps {
  leftColumn: React.ReactNode;
  centerColumn: React.ReactNode;
  rightColumn: React.ReactNode;
  className?: string;
}

export const ClinicalReviewLayout: React.FC<ClinicalReviewLayoutProps> = ({
  leftColumn,
  centerColumn,
  rightColumn,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 gap-8 ${className}`}>
      {/* Patient Context (Left: 4 cols) */}
      <div className="xl:col-span-4 space-y-6">
        {leftColumn}
      </div>

      {/* Junior Assessment (Center: 4 cols) */}
      <div className="xl:col-span-4 space-y-6 border-t xl:border-t-0 pt-6 xl:pt-0">
        {centerColumn}
      </div>

      {/* AI Intelligence (Right: 4 cols) */}
      <div className="xl:col-span-4 space-y-6 border-t xl:border-t-0 pt-6 xl:pt-0">
        {rightColumn}
      </div>
    </div>
  );
};
