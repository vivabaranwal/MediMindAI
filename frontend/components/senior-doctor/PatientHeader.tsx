import React from "react";
import { Patient } from "@/types/senior-doctor";
import { RiskBadge } from "./RiskBadge";
import Link from "next/link";

interface PatientHeaderProps {
  patient: Patient;
  backHref?: string;
  actionButton?: React.ReactNode;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, backHref, actionButton }) => {
  return (
    <div className="bg-white border border-gray-300 p-6 rounded-[4px] space-y-4">
      {backHref && (
        <div className="border-b border-gray-200 pb-3 mb-2 flex items-center justify-between">
          <Link href={backHref} className="text-xs font-bold text-clinical-blue hover:text-clinical-blue-dark uppercase tracking-wider flex items-center gap-1">
            ← Return to Dashboard
          </Link>
          <div className="flex gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">System Code:</span>
            <span className="text-[10px] font-mono font-bold text-gray-500">{patient.code}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-clinical-blue-light text-clinical-blue text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] uppercase tracking-wider">
              Token #{patient.token}
            </span>
            <RiskBadge acuity={patient.acuity} />
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${
              patient.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
              patient.status === "In Review" ? "bg-clinical-blue-light text-clinical-blue" :
              "bg-clinical-green-light text-clinical-green"
            }`}>
              {patient.status}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-600 mt-2 uppercase tracking-tight">
            {patient.name}
          </h2>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-450 uppercase font-semibold mt-1">
            <span>Age: {patient.age} Years</span>
            <span className="text-gray-300">|</span>
            <span>Gender: {patient.gender}</span>
            {patient.vitals && (
              <>
                <span className="text-gray-300">|</span>
                <span>BP: {patient.vitals.bp || "--"}</span>
                <span className="text-gray-300">|</span>
                <span>HR: {patient.vitals.hr ? `${patient.vitals.hr} BPM` : "--"}</span>
                <span className="text-gray-300">|</span>
                <span>Temp: {patient.vitals.temp || "--"}</span>
              </>
            )}
          </div>
        </div>

        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>
    </div>
  );
};
