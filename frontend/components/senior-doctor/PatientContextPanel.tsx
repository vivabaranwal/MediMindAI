import React, { useState } from "react";
import { Patient, UploadedReport } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReportViewer } from "./ReportViewer";

interface PatientContextPanelProps {
  patient: Patient;
  className?: string;
}

export const PatientContextPanel: React.FC<PatientContextPanelProps> = ({ patient, className = "" }) => {
  const [selectedReport, setSelectedReport] = useState<UploadedReport | null>(null);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Demographics Card */}
      <Card titleText="PATIENT PROFILE" className="border border-gray-300">
        <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-gray-650 text-left">
          <div className="border-b border-gray-150 pb-2">
            <span className="text-[9px] text-gray-400 block font-bold">Contact</span>
            <span className="text-sm font-bold text-gray-600">{patient.contact || "--"}</span>
          </div>
          <div className="border-b border-gray-150 pb-2">
            <span className="text-[9px] text-gray-400 block font-bold">Residential Address</span>
            <span className="text-xs font-bold text-gray-550 normal-case leading-relaxed block">
              {patient.address || "--"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] text-gray-400 block font-bold text-clinical-red">ALLERGIES</span>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="bg-clinical-red-light text-clinical-red px-2 py-0.5 rounded text-[10px] font-bold">
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">None documented</span>
              )}
            </div>
            <div>
              <span className="text-[9px] text-gray-400 block font-bold text-clinical-blue">ACTIVE RX</span>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-500 normal-case font-normal mt-1">
                {patient.currentMedications?.map((m, i) => (
                  <li key={i}>{m}</li>
                )) || <li>None</li>}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Medical History Card */}
      <Card titleText="MEDICAL RECORD HISTORY" className="border border-gray-300">
        <div className="space-y-3 text-xs uppercase font-semibold text-gray-650 text-left">
          <div>
            <span className="text-[9px] text-gray-400 block font-bold">Pre-existing Conditions</span>
            <ul className="list-disc pl-4 space-y-1 text-gray-550 normal-case font-normal mt-1">
              {patient.medicalHistory?.map((h, i) => (
                <li key={i}>{h}</li>
              )) || <li>No history logged</li>}
            </ul>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <span className="text-[9px] text-gray-400 block font-bold mb-2">Previous Consultation Records</span>
            {patient.previousVisits && patient.previousVisits.length > 0 ? (
              <div className="space-y-3.5">
                {patient.previousVisits.map((v, i) => (
                  <div key={i} className="bg-gray-50 p-2.5 border border-gray-200 rounded">
                    <div className="flex justify-between items-center text-[10px] border-b border-gray-200 pb-1.5 mb-1.5 font-bold">
                      <span className="text-clinical-blue">{v.date}</span>
                      <span className="text-gray-400">{v.doctor}</span>
                    </div>
                    <span className="text-gray-650 font-bold block text-xs leading-none">{v.diagnosis}</span>
                    <p className="text-[10px] text-gray-400 mt-1.5 normal-case font-normal leading-relaxed">
                      &ldquo;{v.notes}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-450 text-[10px]">No previous consultations found in EMR.</span>
            )}
          </div>
        </div>
      </Card>

      {/* Uploaded Scans & Reports Card */}
      <Card titleText="LABS & CLINICAL SCAN SHEETS" className="border border-gray-300">
        {patient.uploadedReports && patient.uploadedReports.length > 0 ? (
          <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-gray-650 text-left">
            {patient.uploadedReports.map((report) => (
              <div
                key={report.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div>
                  <span className="text-gray-600 font-bold block">{report.name}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Uploaded {report.uploadedAt}</span>
                </div>
                <Button variant="secondary" size="sm" className="h-7 text-[10px]">
                  PREVIEW
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-450 text-center py-4 font-semibold uppercase tracking-wider">
            No report files uploaded.
          </p>
        )}
      </Card>

      {/* Report Review Center Component Modal */}
      <ReportViewer
        report={selectedReport}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
};
