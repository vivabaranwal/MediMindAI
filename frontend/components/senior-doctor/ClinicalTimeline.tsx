import React from "react";
import { Patient, SOAPNote, Prescription, FollowUpPlan } from "@/types/senior-doctor";

interface ClinicalTimelineProps {
  patient: Patient;
  soapNote?: SOAPNote;
  prescription?: Prescription;
  followupPlan?: FollowUpPlan;
  className?: string;
}

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({
  patient,
  soapNote,
  prescription,
  followupPlan,
  className = "",
}) => {
  const steps = [
    {
      title: "Clinic Registration",
      desc: "Patient checked-in by Reception desk and token assigned.",
      isDone: true,
      isActive: false,
    },
    {
      title: "Junior Intake Check",
      desc: "Resident took demographics, vitals, and chief complaints.",
      isDone: true,
      isActive: false,
    },
    {
      title: "Senior Differential Review",
      desc: "Consultant evaluated scans, lab panels, and AI diagnoses.",
      isDone: soapNote?.status === "approved" || patient.status === "Completed",
      isActive: patient.status !== "Completed" && soapNote?.status !== "approved",
    },
    {
      title: "SOAP & Prescription Sign",
      desc: "SOAP transcript locked, drug regimen signed and sent to pharmacy.",
      isDone: (soapNote?.status === "approved" && prescription?.status === "approved") || patient.status === "Completed",
      isActive: soapNote?.status === "approved" && prescription?.status !== "approved",
    },
    {
      title: "Follow-Up & Closure",
      desc: "Discharge instructions delivered. Case session successfully closed.",
      isDone: patient.status === "Completed",
      isActive: (prescription?.status === "approved" || followupPlan?.status === "saved") && patient.status !== "Completed",
    },
  ];

  return (
    <div className={`bg-white border border-gray-300 p-6 rounded-[4px] space-y-5 ${className}`}>
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
          CASE DISPATCH STATE
        </span>
        <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">
          Clinical Signoff Pipeline
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
