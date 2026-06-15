import * as React from "react";

export interface EmptyStateProps {
  titleText: string;
  messageText: string;
  className?: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  titleText,
  messageText,
  className = "",
  actionButton,
}) => {
  return (
    <div className={`text-center py-16 px-4 bg-white border border-dashed border-gray-300 rounded-[4px] flex flex-col items-center justify-center ${className}`}>
      <h3 className="font-semibold text-lg text-gray-600 mb-1">
        {titleText}
      </h3>
      <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
        {messageText}
      </p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

EmptyState.displayName = "EmptyState";
