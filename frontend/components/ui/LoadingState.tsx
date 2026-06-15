import * as React from "react";

export const Spinner: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-gray-300 border-t-clinical-blue align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${className}`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![rect(0,0,0,0)]">Loading...</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${
            i === lines - 1 ? "w-1/2" : i % 2 === 0 ? "w-5/6" : "w-full"
          }`} 
        />
      ))}
    </div>
  );
};
