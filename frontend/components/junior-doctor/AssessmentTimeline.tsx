import React from "react";
import { Patient, Assessment } from "@/types/junior-doctor";

interface AssessmentTimelineProps {
  patient: Patient;
  assessment?: Assessment | null;
  className?: string;
}

export const AssessmentTimeline: React.FC<AssessmentTimelineProps> = ({
  patient,
  assessment,
  className = "",
}) => {
  const steps = [
    {
      title: "Patient Check-in",
      desc: "Patient registered and checked-in at Front Reception desk.",
      isDone: true,
      isActive: false,
    },
    {
      title: "Chief Complaint Intake",
      desc: "Record primary complaint and compile clinical vitals snapshot.",
      isDone: patient.status !== "Waiting",
      isActive: patient.status === "Waiting",
    },
    {
      title: "AI Clinical Consultation",
      desc: "Synthesize diagnostics and answer accepted screening questions.",
      isDone: assessment?.status === "completed" || patient.status === "Completed",
      isActive: patient.status === "In Assessment" && assessment?.status !== "completed",
    },
    {
      title: "Specialist Consultation Handoff",
      desc: "Transmit SOAP clinical report to the reviewing Senior Doctor.",
      isDone: patient.status === "Completed",
      isActive: patient.status === "In Assessment" && assessment?.status === "completed",
    },
  ];

  return (
    <div className={`bg-white border border-gray-300 p-6 rounded-[4px] space-y-5 ${className}`}>
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
          WORKFLOW PROGRESSION
        </span>
        <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">
          Case Status Timeline
        </h3>
      </div>

      <div className="relative border-l border-gray-200 pl-6 space-y-6">
        {steps.map((step, idx) => {
          const statusColor = step.isDone
            ? "border-clinical-green bg-clinical-green text-white"
            : step.isActive
            ? "border-clinical-blue bg-white text-clinical-blue ring-4 ring-clinical-blue-light"
            : "border-gray-300 bg-white text-gray-400";

          return (
            <div key={idx} className="relative text-left">
              {/* Dot Icon */}
              <div
                className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${statusColor}`}
                style={{ width: "18px", height: "18px" }}
              >
                {step.isDone && "✓"}
              </div>

              {/* Step Info */}
              <div className="space-y-1">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider ${
                    step.isActive
                      ? "text-clinical-blue"
                      : step.isDone
                      ? "text-gray-600"
                      : "text-gray-400"
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-xs text-gray-450 leading-relaxed font-semibold">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
