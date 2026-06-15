import React, { useState, useEffect } from "react";
import { SOAPNote } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface SOAPEditorProps {
  soapNote: SOAPNote;
  onSave: (fields: Partial<SOAPNote>) => void;
  onApprove: () => void;
  className?: string;
}

export const SOAPEditor: React.FC<SOAPEditorProps> = ({
  soapNote,
  onSave,
  onApprove,
  className = "",
}) => {
  const [subjective, setSubjective] = useState(soapNote.subjective);
  const [objective, setObjective] = useState(soapNote.objective);
  const [assessment, setAssessment] = useState(soapNote.assessment);
  const [plan, setPlan] = useState(soapNote.plan);
  const [saveAlert, setSaveAlert] = useState(false);

  useEffect(() => {
    setSubjective(soapNote.subjective);
    setObjective(soapNote.objective);
    setAssessment(soapNote.assessment);
    setPlan(soapNote.plan);
  }, [soapNote]);

  const handleSaveDraft = () => {
    onSave({ subjective, objective, assessment, plan });
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 2000);
  };

  const isApproved = soapNote.status === "approved";

  return (
    <Card titleText="SOAP NOTE BUILDER" className={`border border-gray-300 ${className}`}>
      {saveAlert && (
        <Alert type="success" titleText="Draft Saved" className="mb-4 animate-fade-in-up">
          Clinical SOAP note progress has been securely updated.
        </Alert>
      )}

      {isApproved && (
        <Alert type="success" titleText="SOAP Approved" className="mb-4">
          Clinical assessment approved and signed. EMR transcript is locked for editing.
        </Alert>
      )}

      <div className="space-y-6 text-left">
        {/* Subjective */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Subjective (Symptom Narratives)
          </label>
          <textarea
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            disabled={isApproved}
            rows={4}
            className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded p-3 focus:outline-none focus:border-clinical-blue disabled:bg-gray-50 disabled:text-gray-500 leading-relaxed font-sans"
            placeholder="Record symptoms, complaint history, duration, family risk profiles..."
          />
        </div>

        {/* Objective */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Objective (Physical Exam & Labs)
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={isApproved}
            rows={4}
            className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded p-3 focus:outline-none focus:border-clinical-blue disabled:bg-gray-50 disabled:text-gray-500 leading-relaxed font-sans"
            placeholder="Record blood pressure, oxygen saturation levels, otoscopic results, scope scans..."
          />
        </div>

        {/* Assessment */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Assessment (Clinical Judgement Differentials)
          </label>
          <textarea
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            disabled={isApproved}
            rows={4}
            className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded p-3 focus:outline-none focus:border-clinical-blue disabled:bg-gray-50 disabled:text-gray-500 leading-relaxed font-sans"
            placeholder="Record primary differentials, probability rankings, and systemic rules-out..."
          />
        </div>

        {/* Plan */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Plan (Diagnostics, Rx, Follow-Up orders)
          </label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            disabled={isApproved}
            rows={4}
            className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded p-3 focus:outline-none focus:border-clinical-blue disabled:bg-gray-50 disabled:text-gray-500 leading-relaxed font-sans"
            placeholder="Outline therapeutics, medications, scheduling intervals, or surgical preparations..."
          />
        </div>

        {/* Actions bar */}
        {!isApproved && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={handleSaveDraft}>
              SAVE DRAFT NOTE
            </Button>
            <Button variant="primary" onClick={onApprove} className="tracking-wider font-bold">
              APPROVE & SIGN SOAP
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
