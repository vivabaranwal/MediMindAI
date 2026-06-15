import * as React from "react";

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className = "", label, checked, onChange, ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-3 cursor-pointer text-base font-normal text-gray-600 ${className}`}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clinical-blue" />
        </div>
        {label && <span className="leading-none">{label}</span>}
      </label>
    );
  }
);

Toggle.displayName = "Toggle";
