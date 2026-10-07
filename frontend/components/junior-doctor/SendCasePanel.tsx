import React, { useState } from "react";
import { Doctor } from "@/types/junior-doctor";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface SendCasePanelProps {
  doctors: Doctor[];
  /** Must reject (throw) if the handoff fails so the panel can show why. */
  onSend: (doctorId: number) => Promise<void>;
  className?: string;
}

export const SendCasePanel: React.FC<SendCasePanelProps> = ({ doctors, onSend, className = "" }) => {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;

    setSubmitting(true);
    setError("");
    try {
      await onSend(Number(selectedDocId));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handoff failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-300 p-6 rounded-[4px] space-y-4 ${className}`}>
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">CASE DISPATCH HUB</span>
        <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">Supervising Specialist Handoff</h3>
        <p className="text-xs text-gray-450 mt-1 leading-normal">
          Dispatched assessments appear in the selected doctor&apos;s review queue.
        </p>
      </div>

      {success ? (
        <Alert type="success" titleText="Case Dispatched Successfully" className="mt-4 animate-fade-in-up">
          This patient case has been transferred to the selected doctor.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert type="error" titleText="Handoff failed">
              {error}
            </Alert>
          )}

          <Select label="SELECT REVIEWING DOCTOR" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} required>
            <option value="">-- Choose Reviewing Doctor --</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
                {doc.specialization ? ` (${doc.specialization})` : ""}
              </option>
            ))}
          </Select>

          <div className="bg-gray-50 border border-gray-250 p-3.5 rounded text-[11px] font-semibold text-gray-450 leading-relaxed uppercase">
            By dispatching, you confirm the intake summary accurately reflects the patient&apos;s answers.
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full tracking-wider font-bold text-xs py-3"
            disabled={submitting || !selectedDocId}
          >
            {submitting ? "SENDING..." : "SEND CASE FOR REVIEW"}
          </Button>
        </form>
      )}
    </div>
  );
};
