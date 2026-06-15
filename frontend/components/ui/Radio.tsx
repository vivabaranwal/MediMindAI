import * as React from "react";

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className = "", label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-3 cursor-pointer text-base font-normal text-gray-600">
        <input
          ref={ref}
          type="radio"
          className={`w-4 h-4 bg-white border border-gray-300 rounded-full text-clinical-blue focus:ring-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-clinical-blue ${className}`}
          {...props}
        />
        <span className="leading-none">{label}</span>
      </label>
    );
  }
);

Radio.displayName = "Radio";
