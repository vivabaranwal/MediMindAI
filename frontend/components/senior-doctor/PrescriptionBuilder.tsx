"use client";

import React, { useState, useRef, useEffect } from "react";
import { Prescription, PrescriptionMedication } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { PrescriptionService } from "@/services/prescription.service";

interface PrescriptionBuilderProps {
  prescription: Prescription;
  patientAllergies: string[];
  onAddMedication: (med: PrescriptionMedication) => void;
  onRemoveMedication: (medId: string) => void;
  onApprove: () => void;
  className?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Searchable Drug Combo-Box
// ──────────────────────────────────────────────────────────────────────────────
interface DrugComboBoxProps {
  catalog: string[];
  value: string;
  onChange: (drug: string) => void;
  disabled?: boolean;
}

const DrugComboBox: React.FC<DrugComboBoxProps> = ({ catalog, value, onChange, disabled }) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value back to query display
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = catalog.filter((d) => d.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (drug: string) => {
    setQuery(drug);
    onChange(drug);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(""); // Clear until selection
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">
        SELECT DRUG FROM E-CATALOG
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Type to search medication…"
        disabled={disabled}
        className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-sm max-h-44 overflow-y-auto">
          {filtered.map((drug) => (
            <li
              key={drug}
              className="px-3 py-2 text-xs text-gray-650 font-medium cursor-pointer hover:bg-gray-100"
              onMouseDown={() => handleSelect(drug)}
            >
              {drug}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded px-3 py-2 text-xs text-gray-400">
          No results — use &quot;Add New Medicine&quot; to create a custom entry.
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Prescription Builder
// ──────────────────────────────────────────────────────────────────────────────
export const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({
  prescription,
  patientAllergies,
  onAddMedication,
  onRemoveMedication,
  onApprove,
  className = "",
}) => {
  const [localCatalog, setLocalCatalog] = useState<string[]>(PrescriptionService.getAvailableDrugs());
  const [selectedDrug, setSelectedDrug] = useState("");
  const [dosage, setDosage] = useState("500 mg");
  const [frequency, setFrequency] = useState("Twice Daily (BD)");
  const [duration, setDuration] = useState("7 Days");
  const [instructions, setInstructions] = useState("Post Meals");
  const [drugAlerts, setDrugAlerts] = useState<string[]>([]);

  // Add New Medicine Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [newFrequency, setNewFrequency] = useState("Once Daily (OD)");
  const [newDuration, setNewDuration] = useState("7 Days");
  const [newInstructions, setNewInstructions] = useState("");

  const handleDrugChange = (val: string) => {
    setSelectedDrug(val);
    if (val) {
      const alerts = PrescriptionService.checkAlerts(val, patientAllergies);
      setDrugAlerts(alerts);
      if (val.includes("Drops")) {
        setDosage("4 drops"); setFrequency("Twice Daily (BD)"); setInstructions("Instill in canal");
      } else if (val.includes("Paracetamol")) {
        setDosage("650 mg"); setFrequency("Four Times Daily (QDS)"); setInstructions("PRN for fever");
      } else if (val.includes("1000mg") || val.includes("augmentin")) {
        setDosage("1000 mg"); setFrequency("Twice Daily (BD)");
      } else {
        setDosage("500 mg"); setFrequency("Once Daily (OD)");
      }
    } else {
      setDrugAlerts([]);
    }
  };

  const handleAddDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrug) return;
    const newMed: PrescriptionMedication = {
      id: `med-${Date.now()}`,
      name: selectedDrug,
      dosage,
      frequency,
      duration,
      instructions,
      alerts: PrescriptionService.checkAlerts(selectedDrug, patientAllergies),
    };
    onAddMedication(newMed);
    setSelectedDrug("");
    setDrugAlerts([]);
  };

  const handleAddNewMedicineSubmit = () => {
    if (!newDrugName.trim()) return;
    const name = newDrugName.trim();

    // Add to local searchable catalog so it appears in the combobox
    setLocalCatalog((prev) => (prev.includes(name) ? prev : [name, ...prev]));

    const newMed: PrescriptionMedication = {
      id: `med-custom-${Date.now()}`,
      name,
      dosage: newDosage || "As prescribed",
      frequency: newFrequency,
      duration: newDuration,
      instructions: newInstructions || "As directed",
      alerts: [],
    };
    onAddMedication(newMed);

    // Reset modal fields
    setNewDrugName("");
    setNewDosage("");
    setNewFrequency("Once Daily (OD)");
    setNewDuration("7 Days");
    setNewInstructions("");
    setIsModalOpen(false);
  };

  const isApproved = prescription.status === "approved";

  return (
    <>
      <Card titleText="PHARMACOTHERAPY PRESCRIPTION DESIGNER" className={`border border-gray-300 ${className}`}>
        {isApproved && (
          <Alert type="success" titleText="Prescription Signed & Transmitted" className="mb-4">
            This prescription has been locked, digitally signed, and transmitted to the clinic pharmacy desk.
          </Alert>
        )}

        {/* Allergies Warn Banner */}
        {patientAllergies.length > 0 && (
          <div className="bg-clinical-red-light/25 border-l-[3px] border-clinical-red p-3.5 rounded text-left mb-6">
            <span className="text-[10px] text-clinical-red font-bold block mb-1 uppercase tracking-wider">
              Patient Allergies Flagged
            </span>
            <p className="text-xs text-gray-650 font-semibold uppercase tracking-wider">
              {patientAllergies.join(", ")}
            </p>
          </div>
        )}

        {/* Add Medication Form */}
        {!isApproved && (
          <form onSubmit={handleAddDrug} className="space-y-4 border-b border-gray-200 pb-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* Searchable Combobox */}
              <DrugComboBox
                catalog={localCatalog}
                value={selectedDrug}
                onChange={handleDrugChange}
              />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                  Dosage Configuration
                </label>
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
              <Select
                label="Frequency Schedule"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                required
              >
                <option value="Once Daily (OD)">Once Daily (OD)</option>
                <option value="Twice Daily (BD)">Twice Daily (BD)</option>
                <option value="Three Times Daily (TDS)">Three Times Daily (TDS)</option>
                <option value="Four Times Daily (QDS)">Four Times Daily (QDS)</option>
                <option value="PRN (As Required)">PRN (As Required)</option>
              </Select>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                  Duration
                </label>
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
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                  Usage Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Post Meals / Before Sleep"
                  className="w-full text-xs font-medium text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
                />
              </div>
            </div>

            {/* Drug Interaction Alerts */}
            {drugAlerts.length > 0 && (
              <div className="space-y-2 text-left animate-fade-in-up">
                {drugAlerts.map((alert, idx) => (
                  <Alert key={idx} type={alert.includes("CRITICAL") ? "error" : "warning"} titleText="DRUG SENSITIVITY FLAG">
                    {alert}
                  </Alert>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              {/* Add New Medicine Button */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold tracking-wider"
              >
                + Add New Medicine
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={!selectedDrug || drugAlerts.some((a) => a.includes("CRITICAL"))}
                className="tracking-wider font-bold"
              >
                ADD TO PRESCRIPTION
              </Button>
            </div>
          </form>
        )}

        {/* Prescribed Medications Table */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider text-left">
            Prescribed Medications List
          </h4>

          {prescription.medications.length === 0 ? (
            <p className="text-xs text-gray-450 uppercase font-semibold text-center py-6 border border-dashed border-gray-300 rounded">
              No medications added yet. Choose from catalog above.
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
                      <div>
                        <span>{med.name}</span>
                        {med.alerts && med.alerts.length > 0 && (
                          <span className="block text-[9px] text-clinical-amber font-semibold tracking-wide uppercase mt-0.5">
                            ⚠️ Allergy cross-reaction warning checked
                          </span>
                        )}
                      </div>
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

          {/* Approve & Sign */}
          {!isApproved && prescription.medications.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
              <Button variant="primary" onClick={onApprove} className="tracking-wider font-bold text-xs py-3 px-6">
                APPROVE & SECURELY SIGN PRESCRIPTION
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Add New Medicine Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        titleText="Add New Medicine to Catalog"
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddNewMedicineSubmit} disabled={!newDrugName.trim()}>
              Add & Prescribe
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-gray-450 uppercase font-semibold">
            Enter the details of the medicine not found in the e-catalog. It will be added to the local catalog and directly prescribed.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
              Medicine Name <span className="text-clinical-red">*</span>
            </label>
            <input
              type="text"
              value={newDrugName}
              onChange={(e) => setNewDrugName(e.target.value)}
              placeholder="e.g. Azithromycin 500mg"
              className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Dosage</label>
              <input
                type="text"
                value={newDosage}
                onChange={(e) => setNewDosage(e.target.value)}
                placeholder="e.g. 500 mg"
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Duration</label>
              <input
                type="text"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                placeholder="e.g. 5 Days"
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Frequency</label>
            <select
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value)}
              className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
            >
              <option value="Once Daily (OD)">Once Daily (OD)</option>
              <option value="Twice Daily (BD)">Twice Daily (BD)</option>
              <option value="Three Times Daily (TDS)">Three Times Daily (TDS)</option>
              <option value="Four Times Daily (QDS)">Four Times Daily (QDS)</option>
              <option value="PRN (As Required)">PRN (As Required)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Instructions</label>
            <input
              type="text"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="e.g. After meals, with water"
              className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
