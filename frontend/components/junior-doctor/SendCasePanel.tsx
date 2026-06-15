import React, { useState } from "react";
import { Doctor } from "@/types/junior-doctor";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface SendCasePanelProps {
  doctors: Doctor[];
  onSend: (doctorId: string) => void;
  className?: string;
}

export const SendCasePanel: React.FC<SendCasePanelProps> = ({ doctors, onSend, className = "" }) => {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;

    setSubmitting(true);
    setTimeout(() => {
      onSend(selectedDocId);
      setSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  return (
    <div className={`bg-white border border-gray-300 p-6 rounded-[4px] space-y-4 ${className}`}>
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
          CASE DISPATCH HUB
        </span>
        <h3 className="text-lg font-bold text-gray-600 uppercase tracking-tight">
          Supervising Specialist Handoff
        </h3>
        <p className="text-xs text-gray-450 mt-1 leading-normal">
          Dispatched assessments will appear in the senior doctor&apos;s workspace review queue immediately.
        </p>
      </div>

      {success ? (
        <Alert type="success" titleText="Case Dispatched Successfully" className="mt-4 animate-fade-in-up">
          This patient case has been officially transferred. You can check status history or return to the patient consult queue.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="SELECT REVIEWING SENIOR DOCTOR"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            required
          >
            <option value="">-- Choose Reviewing Specialist --</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.specialty})
              </option>
            ))}
          </Select>

          <div className="bg-gray-50 border border-gray-250 p-3.5 rounded text-[11px] font-semibold text-gray-450 leading-relaxed uppercase">
            ⚠️ CONFIRMATION NOTE: BY CLICKING DISPATCH, YOU CERTIFY THE SYMPTOMS AND SOAP BRIEF ACCURATELY CAPTURE THE PATIENT&apos;S CLINICAL PROFILE.
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full tracking-wider font-bold text-xs py-3"
              disabled={submitting || !selectedDocId}
            >
              {submitting ? "PREPARING SECURE HANDOFF..." : "SEND CASE FOR SPECIALIST REVIEW"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
