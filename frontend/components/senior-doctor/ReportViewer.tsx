import React from "react";
import { UploadedReport } from "@/types/senior-doctor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ReportViewerProps {
  report: UploadedReport | null;
  isOpen: boolean;
  onClose: () => void;
  onReanalyze?: (reportId: number) => void;
}

const WARNING_TEXT: Record<string, string> = {
  patient_name_mismatch: "The name printed on this report does not match the patient. Check it was attached to the right record.",
  low_confidence_ocr: "Some pages were hard to read. Verify values against the original document.",
};

const FLAG_STYLE: Record<string, string> = {
  low: "text-clinical-amber",
  high: "text-clinical-amber",
  critical: "text-clinical-red",
  normal: "text-gray-600",
  unknown: "text-gray-500",
};

const ERROR_TEXT: Record<string, string> = {
  ai_consent_required: "Not analysed: the patient has not consented to AI-assisted processing.",
  ocr_failed: "No readable text could be extracted from this document.",
  file_rejected: "The file could not be processed.",
  unsupported_file_type: "Unsupported file type.",
  ai_unavailable: "Analysis failed because the AI service was unavailable. You can retry.",
  file_missing: "The stored file could not be found.",
};

export const ReportViewer: React.FC<ReportViewerProps> = ({ report, isOpen, onClose, onReanalyze }) => {
  if (!report) return null;
  const analysed = report.status === "analyzed";
  const pending = report.status === "pending_analysis" || report.status === "analyzing";

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleText={`REPORT: ${report.name}`}>
      <div className="space-y-5 text-left text-xs">
        {report.warnings.map((w) => (
          <Alert key={w} type="warning" titleText="Check this report">
            {WARNING_TEXT[w] ?? w}
          </Alert>
        ))}

        {pending && (
          <Alert type="info" titleText="Analysis in progress">
            The AI is reading this report. Reopen it in a moment.
          </Alert>
        )}

        {(report.status === "failed" || report.status === "not_analyzed") && (
          <Alert type="warning" titleText="Not analysed">
            {(report.analysisError && ERROR_TEXT[report.analysisError]) || "This report has not been analysed."}
          </Alert>
        )}

        {analysed && (
          <>
            {report.summary && (
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">AI SUMMARY</span>
                <p className="font-normal text-xs text-gray-650 bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed mt-1">{report.summary}</p>
              </div>
            )}

            {report.abnormalities.length > 0 && (
              <div>
                <span className="text-[10px] text-clinical-red block font-bold uppercase tracking-wider">ABNORMAL FINDINGS</span>
                <ul className="mt-2 space-y-1.5">
                  {report.abnormalities.map((abn, idx) => (
                    <li key={idx} className="bg-clinical-red-light text-clinical-red px-2.5 py-1 rounded text-[11px] font-semibold">
                      {abn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.values.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">EXTRACTED VALUES</span>
                <table className="w-full mt-2 border border-gray-200 text-[11px]">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                    <tr>
                      <th className="text-left p-2">Test</th>
                      <th className="text-left p-2">Result</th>
                      <th className="text-left p-2">Reference</th>
                      <th className="text-left p-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.values.map((v, i) => (
                      <tr key={i} className="border-t border-gray-150">
                        <td className="p-2 font-semibold text-gray-600">{v.name}</td>
                        <td className="p-2">{v.value}{v.unit ? ` ${v.unit}` : ""}</td>
                        <td className="p-2 text-gray-500">{v.reference_range ?? "—"}</td>
                        <td className={`p-2 font-bold uppercase ${FLAG_STYLE[v.flag]}`}>{v.flag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.observations.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">OBSERVATIONS ON THE REPORT</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 font-normal">
                  {report.observations.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10px] text-gray-400 font-normal leading-relaxed">
              Extracted automatically (OCR and AI). Verify against the original document before relying on any value.
            </p>
          </>
        )}
      </div>

      <div className="flex justify-between pt-4 mt-6 border-t border-gray-200">
        {onReanalyze ? (
          <Button variant="secondary" onClick={() => onReanalyze(report.reportId)} disabled={pending}>
            RE-ANALYSE
          </Button>
        ) : (
          <span />
        )}
        <Button variant="secondary" onClick={onClose}>
          CLOSE
        </Button>
      </div>
    </Modal>
  );
};
