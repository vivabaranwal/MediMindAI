import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Patient } from "@/types/junior-doctor";
import { RiskBadge } from "./RiskBadge";
import Link from "next/link";

interface PatientCardProps {
  patient: Patient;
  onAssess?: () => void;
  className?: string;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onAssess, className = "" }) => {
  return (
    <Card className={`border border-gray-300 hover:border-gray-400 transition-colors ${className}`}>
      <div className="space-y-4">
        {/* Header: Token, ID Code and Risk Badge */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-clinical-blue text-sm uppercase tracking-wider">
                Token #{patient.token}
              </span>
              <span className="font-mono text-xs font-bold text-gray-400 uppercase tracking-tight">
                {patient.code}
              </span>
            </div>
            <h4 className="text-base font-bold text-gray-600 mt-1 uppercase tracking-tight">
              {patient.name}
            </h4>
            <p className="text-xs text-gray-450 font-semibold uppercase tracking-wider">
              {patient.age} Yrs / {patient.gender}
            </p>
          </div>
          <RiskBadge acuity={patient.acuity} />
        </div>

        {/* Vitals Summary Grid */}
        {patient.vitals && (
          <div className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded border border-gray-200 text-center">
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">BP</span>
              <span className="text-xs font-bold text-gray-500">{patient.vitals.bp || "--"}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">HR</span>
              <span className="text-xs font-bold text-gray-500">{patient.vitals.hr ? `${patient.vitals.hr} bpm` : "--"}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">TEMP</span>
              <span className="text-xs font-bold text-gray-500">{patient.vitals.temp || "--"}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">SPO2</span>
              <span className="text-xs font-bold text-gray-500">{patient.vitals.spo2 ? `${patient.vitals.spo2}%` : "--"}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 gap-4">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Intake State</span>
            <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider ${
              patient.status === "Waiting" ? "text-clinical-amber" :
              patient.status === "In Assessment" ? "text-clinical-blue" :
              "text-clinical-green"
            }`}>
              {patient.status}
            </span>
          </div>

          <div className="flex gap-2">
            <Link href={`/junior-doctor/patient/${patient.id}`}>
              <Button variant="secondary" size="sm" className="px-3">
                Details
              </Button>
            </Link>
            {patient.status !== "Completed" && (
              <Button variant="primary" size="sm" onClick={onAssess} className="px-3">
                {patient.status === "In Assessment" ? "Resume" : "Assess"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
