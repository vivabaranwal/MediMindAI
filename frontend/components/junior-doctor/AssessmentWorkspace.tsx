import React from "react";

interface AssessmentWorkspaceProps {
  children: React.ReactNode;
  className?: string;
}

export const AssessmentWorkspace: React.FC<AssessmentWorkspaceProps> = ({ children, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${className}`}>
      {children}
    </div>
  );
};
