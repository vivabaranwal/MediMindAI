"use client";

import React, { useState, useRef, useEffect } from "react";
import { Prescription, PrescriptionMedication } from "@/types/senior-doctor";
import { AlertDto } from "@/types/ai";
import { AiService } from "@/services/ai.service";
import { toApiError } from "@/lib/errors";
import { FORMULARY } from "@/lib/formulary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

interface PrescriptionBuilderProps {
  prescription: Prescription;
  patientId: number;
  patientAllergies: string[];
  onAddMedication: (med: PrescriptionMedication) => void | Promise<void>;
  onRemoveMedication: (medId: string) => void;
  /** The diagnosis (the issue being treated). It is printed on the prescription and is required to sign. */
  onDiagnosisChange: (diagnosis: string) => void;
  diagnosisSuggestions?: string[];
  /** Called with `true` after the doctor confirms an override of critical allergy alerts. */
  onApprove: (acknowledgeCritical: boolean) => Promise<void>;
  className?: string;
}

const FREQUENCIES = ["Once Daily (OD)", "Twice Daily (BD)", "Three Times Daily (TDS)", "Four Times Daily (QDS)", "PRN (As Required)"];

interface Pending {
  med: PrescriptionMedication;
  alerts: AlertDto[];
}

// ---------------------------------------------------------------------------- combo box

const DrugComboBox: React.FC<{ value: string; onChange: (drug: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = FORMULARY.filter((d) => d.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">MEDICINE</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type any medicine name…"
        required
        autoComplete="off"
        className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
      />
      {open && value.length > 0 && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-sm max-h-44 overflow-y-auto">
          {filtered.map((drug) => (
            <li
              key={drug}
              className="px-3 py-2 text-xs text-gray-650 font-medium cursor-pointer hover:bg-gray-100"
              onMouseDown={() => {
                onChange(drug);
                setOpen(false);
              }}
            >
              {drug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------ main component

export const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({
  prescription,
  patientId,
  patientAllergies,
  onAddMedication,
  onRemoveMedication,
  onDiagnosisChange,
  diagnosisSuggestions = [],
  onApprove,
  className = "",
}) => {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");

  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");

  const isApproved = prescription.status === "approved";

  const reset = () => {
    setName("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setInstructions("");
  };

  /** Run the server-side safety check for one medicine, then add it (or ask for an override). */
  const checkAndAdd = async (med: PrescriptionMedication) => {
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      const { alerts, model_check } = await check(med);
      if (model_check.status !== "ok") {
        setNotice(
          model_check.status === "skipped"
            ? "The AI interaction review was skipped (patient has not consented to AI processing). The allergy check was still applied."
            : "The AI interaction review is unavailable right now. The allergy check was still applied.",
        );
      }
      const withAlerts: PrescriptionMedication = { ...med, alerts };
      if (alerts.some((a) => a.severity === "critical")) {
        setPending({ med: withAlerts, alerts }); // doctor must explicitly override
      } else {
        await onAddMedication(withAlerts);
        reset();
      }
    } catch (err) {
      setError(toApiError(err, "The safety check could not be completed.").message);
    } finally {
      setChecking(false);
    }
  };

  const check = async (med: PrescriptionMedication) => {
    const res = await AiService.checkPrescription(patientId, prescription.selectedDiagnosis || undefined, [
      ...prescription.medications.map((m) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration })),
      { name: med.name, dosage: med.dosage, frequency: med.frequency, duration: med.duration },
    ]);
    // Keep only alerts about the medicine being added; earlier ones were shown when they were added.
    return { alerts: res.alerts.filter((a) => a.medication === med.name), model_check: res.model_check };
  };

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await checkAndAdd({
      id: `med-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      duration: duration.trim(),
      instructions: instructions.trim(),
      alerts: [],
    });
  };

  const confirmOverride = async () => {
    if (!pending) return;
    await onAddMedication(pending.med);
    setPending(null);
    reset();
  };

  const handleCustomSubmit = () => {
    if (!customName.trim()) return;
    setName(customName.trim());
    setCustomName("");
    setIsModalOpen(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      await onApprove(false);
    } catch (err) {
      const e = toApiError(err);
      if (e.code === "critical_allergy_alert" && window.confirm(`${e.message}\n\nApprove anyway? This override is your clinical responsibility.`)) {
        try {
          await onApprove(true);
        } catch (err2) {
          setError(toApiError(err2).message);
        }
      } else if (e.code !== "critical_allergy_alert") {
        setError(e.message);
      }
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <Card titleText="PRESCRIPTION BUILDER" className={`border border-gray-300 ${className}`}>
        {isApproved && (
          <Alert type="success" titleText="Prescription Signed" className="mb-4">
            This prescription has been approved and locked.
          </Alert>
        )}

        {patientAllergies.length > 0 && (
          <div className="bg-clinical-red-light/25 border-l-[3px] border-clinical-red p-3.5 rounded text-left mb-6">
            <span className="text-[10px] text-clinical-red font-bold block mb-1 uppercase tracking-wider">Patient Allergies Flagged</span>
            <p className="text-xs text-gray-650 font-semibold uppercase tracking-wider">{patientAllergies.join(", ")}</p>
          </div>
        )}

        {error && (
          <Alert type="error" titleText="Could not complete the action" className="mb-4">
            {error}
          </Alert>
        )}
        {notice && (
          <Alert type="info" titleText="Partial safety check" className="mb-4">
            {notice}
          </Alert>
        )}

        <div className="text-left mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
            Diagnosis (the issue being treated){!isApproved && <span className="text-clinical-red ml-1 font-bold">*</span>}
          </label>
          {isApproved ? (
            <p className="text-sm font-semibold text-gray-650">{prescription.selectedDiagnosis || "Not recorded"}</p>
          ) : (
            <>
              <input
                list="rx-diagnosis-suggestions"
                value={prescription.selectedDiagnosis}
                onChange={(e) => onDiagnosisChange(e.target.value)}
                maxLength={500}
                placeholder="e.g. Acute otitis externa, left ear"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-base focus:outline-none focus:border-clinical-blue"
              />
              <datalist id="rx-diagnosis-suggestions">
                {diagnosisSuggestions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {diagnosisSuggestions.length > 0 && (
                <p className="text-[11px] text-gray-400 leading-normal">
                  AI suggestions are available in the list as you type. They are options, not a diagnosis. Enter what you conclude.
                </p>
              )}
            </>
          )}
        </div>

        {!isApproved && (
          <form onSubmit={handleAddDrug} className="space-y-4 border-b border-gray-200 pb-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <DrugComboBox value={name} onChange={setName} />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Dosage</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500 mg / 1 tab"
                  required
                  className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} required>
                <option value="">-- Select --</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 7 Days"
                  required
                  className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Usage Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. After meals"
                  className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
                />
              </div>
            </div>

            {pending && (
              <div className="space-y-2 text-left animate-fade-in-up">
                {pending.alerts.map((a, i) => (
                  <Alert key={i} type={a.severity === "critical" ? "error" : "warning"} titleText={a.severity === "critical" ? "ALLERGY CONFLICT" : "SAFETY NOTE"}>
                    {a.message}
                  </Alert>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPending(null)}>
                    Don&apos;t add
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={confirmOverride}>
                    Add anyway (I have reviewed this)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(true)} className="text-xs font-bold tracking-wider">
                + Enter Medicine Not Listed
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim() || checking || !!pending} className="tracking-wider font-bold">
                {checking ? "CHECKING SAFETY..." : "CHECK & ADD TO PRESCRIPTION"}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider text-left">Prescribed Medications</h4>

          {prescription.medications.length === 0 ? (
            <p className="text-xs text-gray-450 uppercase font-semibold text-center py-6 border border-dashed border-gray-300 rounded">
              No medications added yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Medication</TableHeaderCell>
                  <TableHeaderCell className="w-[100px]">Dose</TableHeaderCell>
                  <TableHeaderCell>Frequency</TableHeaderCell>
                  <TableHeaderCell className="w-[80px]">Duration</TableHeaderCell>
                  <TableHeaderCell>Instructions</TableHeaderCell>
                  {!isApproved && <TableHeaderCell className="text-right w-[80px]">Action</TableHeaderCell>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescription.medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-bold text-gray-600">
                      <span>{med.name}</span>
                      {med.alerts.map((a, i) => (
                        <span
                          key={i}
                          className={`block text-[9px] font-semibold tracking-wide uppercase mt-0.5 ${a.severity === "critical" ? "text-clinical-red" : "text-clinical-amber"}`}
                        >
                          ⚠ {a.severity === "critical" ? "Overridden allergy conflict" : "Review noted"}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell>{med.dosage}</TableCell>
                    <TableCell>{med.frequency}</TableCell>
                    <TableCell>{med.duration}</TableCell>
                    <TableCell className="normal-case text-gray-500 font-normal">{med.instructions}</TableCell>
                    {!isApproved && (
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onRemoveMedication(med.id)}
                          className="text-clinical-red hover:bg-clinical-red-light border-clinical-red/20 px-2 min-w-0"
                        >
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isApproved && prescription.medications.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
              {!prescription.selectedDiagnosis.trim() && (
                <p className="text-xs text-clinical-amber font-semibold uppercase tracking-wider self-center mr-4">Enter the diagnosis to sign</p>
              )}
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={approving || !prescription.selectedDiagnosis.trim()}
                className="tracking-wider font-bold text-xs py-3 px-6"
              >
                {approving ? "APPROVING..." : "APPROVE & SIGN PRESCRIPTION"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        titleText="Enter a medicine not in the list"
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCustomSubmit} disabled={!customName.trim()}>
              Use this name
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-gray-450 uppercase font-semibold">
            It then goes through the same allergy and interaction check as every other medicine. Fill in the dose, frequency and duration in the form.
          </p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Azithromycin 500mg"
            className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
          />
        </div>
      </Modal>
    </>
  );
};
