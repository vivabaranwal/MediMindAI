import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, required, disabled, children, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full space-y-2 text-left">
        {label && (
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {label}
            {required && <span className="text-clinical-red ml-1 font-bold">*</span>}
          </label>
        )}
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full px-4 py-3 bg-white border rounded text-base font-normal leading-normal transition-colors
            focus-visible:outline-none focus-visible:border-clinical-blue focus-visible:ring-0 focus:outline-none focus:border-clinical-blue focus:ring-0
            ${
              disabled 
                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" 
                : error 
                  ? "border-2 border-clinical-red" 
                  : "border-gray-300"
            } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-xs text-clinical-red font-normal block leading-normal mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
