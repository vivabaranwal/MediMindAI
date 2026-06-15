import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FollowUpService } from "@/services/followup.service";

interface FollowUpPlannerProps {
  initialTimeframe?: "3" | "7" | "14" | "30" | "custom";
  initialInstructions?: string;
  initialCustomDays?: string;
  onSave: (timeframe: "3" | "7" | "14" | "30" | "custom", instructions: string, customDays?: string) => void;
  className?: string;
}

export const FollowUpPlanner: React.FC<FollowUpPlannerProps> = ({
  initialTimeframe = "7",
  initialInstructions = "",
  initialCustomDays = "",
  onSave,
  className = "",
}) => {
  const [timeframe, setTimeframe] = useState<"3" | "7" | "14" | "30" | "custom">(initialTimeframe);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [customDays, setCustomDays] = useState(initialCustomDays);
  const [successAlert, setSuccessAlert] = useState(false);

  useEffect(() => {
    // If empty instructions, populate standard default instructions
    if (!instructions) {
      setInstructions(FollowUpService.getDefaultInstructions(timeframe));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const handleTimeframeChange = (val: "3" | "7" | "14" | "30" | "custom") => {
    setTimeframe(val);
    setInstructions(FollowUpService.getDefaultInstructions(val));
  };

  const handleSave = () => {
    onSave(timeframe, instructions, timeframe === "custom" ? customDays : undefined);
    setSuccessAlert(true);
    setTimeout(() => setSuccessAlert(false), 2000);
  };

  return (
    <Card titleText="PATIENT FOLLOW-UP & CARE PLANNER" className={`border border-gray-300 ${className}`}>
      {successAlert && (
        <Alert type="success" titleText="Follow-Up Plan Saved" className="mb-4 animate-pulse">
          Care plan and review schedules updated in EMR.
        </Alert>
      )}

      <div className="space-y-6 text-left">
        {/* Timeframe selector buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Select Review Timeframe
          </label>
          <div className="flex flex-wrap gap-2">
            {(["3", "7", "14", "30", "custom"] as const).map((opt) => {
              const label = opt === "custom" ? "Custom Days" : `Day ${opt}`;
              const isActive = timeframe === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTimeframeChange(opt)}
                  className={`px-4 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-150 border ${
                    isActive
                      ? "bg-clinical-blue text-white border-clinical-blue"
                      : "bg-white text-gray-500 border-gray-300 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Days Input */}
        {timeframe === "custom" && (
          <div className="space-y-2 animate-fade-in-up">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
              Enter Custom Days Count
            </label>
            <input
              type="number"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="e.g. 45"
              required
              className="w-full text-xs font-medium text-gray-655 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
            />
          </div>
        )}

        {/* Care Instructions textarea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Patient Post-Consultation Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className="w-full text-xs font-medium text-gray-655 bg-white border border-gray-300 rounded p-3 focus:outline-none focus:border-clinical-blue leading-relaxed font-sans"
            placeholder="Outline symptoms to monitor, drug administration rules, or emergency indicators..."
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="primary" onClick={handleSave} className="tracking-wider font-bold">
            SAVE CARE PLAN SCHEDULE
          </Button>
        </div>
      </div>
    </Card>
  );
};
