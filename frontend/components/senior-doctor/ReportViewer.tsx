import React from "react";
import { UploadedReport } from "@/types/senior-doctor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ReportViewerProps {
  report: UploadedReport | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleText={`REPORT REVIEW CENTER: ${report.name}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 text-left font-semibold uppercase tracking-wider text-xs">
        {/* Visual preview block */}
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 block font-bold">VISUAL PREVIEW CHANNEL</span>
          <div className="aspect-[4/3] bg-gray-100 border border-gray-300 flex items-center justify-center rounded">
            <div className="text-center space-y-1.5 p-4">
              <span className="text-4xl block">
                {report.type === "image" ? "🖼️" : "📄"}
              </span>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                {report.type === "image" ? "MOCK IMAGE PREVIEW ATTACHED" : "MOCK PDF DOCUMENT PAGE"}
              </p>
              <p className="text-[9px] text-gray-400 normal-case">
                Sha256 encrypted verification file synced.
              </p>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 block font-bold">OCR TRANSCRIPTION SUMMARY</span>
            <p className="normal-case font-normal text-xs text-gray-650 bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed mt-1">
              {report.ocrFindings}
            </p>
          </div>
        </div>

        {/* Extracted stats block */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] text-gray-400 block font-bold">EXTRACTED LAB BIO-METRICS</span>
            <div className="space-y-1.5 mt-2 bg-gray-50 p-3 rounded border border-gray-200">
              {Object.entries(report.extractedLabValues).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-[11px] border-b border-gray-150 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-gray-550">{key}</span>
                  <span className="font-bold text-gray-600">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-clinical-red block font-bold">ABNORMAL LAB DEVIATIONS</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {report.abnormalFindings.map((abn, idx) => (
                <span key={idx} className="bg-clinical-red-light text-clinical-red px-2.5 py-0.5 rounded text-[10px] font-bold">
                  {abn}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 block font-bold">CLINICAL OBSERVATION DIGEST</span>
            <p className="normal-case font-normal text-xs text-gray-655 leading-relaxed mt-1">
              {report.clinicalObservations}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>
          CLOSE REVIEWER
        </Button>
      </div>
    </Modal>
  );
};
