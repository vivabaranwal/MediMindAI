import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

interface AnswerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  dictationSample?: string;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Record clinical details here...",
  required = false,
  rows = 4,
  dictationSample = "Patient notes localized pain during touch, resolving after warm compress.",
}) => {
  const [dictationState, setDictationState] = useState<"idle" | "listening" | "processing">("idle");

  const triggerDictation = async () => {
    if (dictationState === "idle") {
      setDictationState("listening");
      // Simulate listening for 2 seconds
      setTimeout(() => {
        setDictationState("processing");
        // Simulate processing for 1 second
        setTimeout(() => {
          onChange(dictationSample);
          setDictationState("idle");
        }, 1000);
      }, 1500);
    }
  };

  return (
    <div className="space-y-2 text-left">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
          {label} {required && <span className="text-clinical-red">*</span>}
        </label>
        
        <Button
          type="button"
          variant={dictationState === "listening" ? "danger" : "secondary"}
          size="sm"
          className="h-7 text-[10px] uppercase tracking-wider font-bold shrink-0"
          onClick={triggerDictation}
          disabled={dictationState === "processing"}
        >
          {dictationState === "idle" && "🎙️ DICTATE"}
          {dictationState === "listening" && "🛑 LISTENING..."}
          {dictationState === "processing" && "⚡ PROCESSING..."}
        </Button>
      </div>

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
};
