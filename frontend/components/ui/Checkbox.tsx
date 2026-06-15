import * as React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, error, required, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1">
        <label className="inline-flex items-start gap-3 cursor-pointer text-base font-normal text-gray-600">
          <input
            ref={ref}
            type="checkbox"
            className={`w-4 h-4 mt-1 bg-white border border-gray-300 rounded-[2px] text-clinical-blue focus:ring-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-clinical-blue ${className}`}
            {...props}
          />
          <span className="leading-relaxed">
            {label}
            {required && <span className="text-clinical-red ml-1 font-bold">*</span>}
          </span>
        </label>
        {error && (
          <span className="text-xs text-clinical-red font-semibold block mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
