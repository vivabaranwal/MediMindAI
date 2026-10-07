import React from "react";

interface AnswerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Record clinical details here...",
  required = false,
  rows = 4,
}) => (
  <div className="space-y-2 text-left">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
      {label} {required && <span className="text-clinical-red">*</span>}
    </label>

    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-base font-normal leading-normal transition-colors focus:outline-none focus:border-clinical-blue placeholder:text-gray-300"
    />
  </div>
);
