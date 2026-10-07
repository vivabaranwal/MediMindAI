import React, { useState } from "react";
import { Patient, UploadedReport } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReportViewer } from "./ReportViewer";
import { AiService } from "@/services/ai.service";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { toApiError } from "@/lib/errors";

const STATUS_LABEL: Record<UploadedReport["status"], string> = {
  pending_analysis: "Queued for analysis",
  analyzing: "Analysing…",
  analyzed: "Analysed",
  failed: "Analysis failed",
  not_analyzed: "Not analysed",
};

interface PatientContextPanelProps {
  patient: Patient;
  className?: string;
}

export const PatientContextPanel: React.FC<PatientContextPanelProps> = ({ patient, className = "" }) => {
  const [selectedReport, setSelectedReport] = useState<UploadedReport | null>(null);
  const [reportError, setReportError] = useState("");
  const loadEncounterForPatient = useSeniorDoctorStore((s) => s.loadEncounterForPatient);

  // Keep the open viewer in sync after the store reloads this patient's reports.
  const liveReport = selectedReport ? patient.uploadedReports?.find((r) => r.reportId === selectedReport.reportId) ?? selectedReport : null;

  const handleReanalyze = async (reportId: number) => {
    setReportError("");
    try {
      await AiService.reanalyzeReport(reportId);
      await loadEncounterForPatient(patient.id);
    } catch (err) {
      setReportError(toApiError(err).message);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Medical History Card */}
      <Card titleText="MEDICAL RECORD HISTORY" className="border border-gray-300">
        <div className="space-y-3 text-xs uppercase font-semibold text-gray-650 text-left">
          <div>
            <span className="text-[9px] text-gray-400 block font-bold">Pre-existing Conditions</span>
            <ul className="list-disc pl-4 space-y-1 text-gray-550 normal-case font-normal mt-1">
              {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                patient.medicalHistory.map((h, i) => <li key={i}>{h}</li>)
              ) : (
                <li>No history logged</li>
              )}
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

          {/* Active RX Section */}
          <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
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
                <span className="text-gray-500 normal-case font-normal">None documented</span>
              )}
            </div>
            <div>
              <span className="text-[9px] text-gray-400 block font-bold text-clinical-blue">ACTIVE RX</span>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-500 normal-case font-normal mt-1">
                {patient.currentMedications && patient.currentMedications.length > 0
                  ? patient.currentMedications.map((m, i) => <li key={i}>{m}</li>)
                  : <li>None</li>}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Scans & Reports Card */}
      <Card titleText="LABS & CLINICAL SCAN SHEETS" className="border border-gray-300">
        {reportError && <p className="text-[11px] text-clinical-red mb-2">{reportError}</p>}
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
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Uploaded {report.uploadedAt} · {STATUS_LABEL[report.status]}
                  </span>
                  {report.warnings.length > 0 && (
                    <span className="text-[10px] text-clinical-amber block mt-0.5">⚠ Needs checking</span>
                  )}
                </div>
                <Button variant="secondary" size="sm" className="h-7 text-[10px]">
                  VIEW
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
        report={liveReport}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        onReanalyze={handleReanalyze}
      />
    </div>
  );
};
