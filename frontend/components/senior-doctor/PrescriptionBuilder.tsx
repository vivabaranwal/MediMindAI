import React, { useState } from "react";
import { Prescription, PrescriptionMedication } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
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

export const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({
  prescription,
  patientAllergies,
  onAddMedication,
  onRemoveMedication,
  onApprove,
  className = "",
}) => {
  const [selectedDrug, setSelectedDrug] = useState("");
  const [dosage, setDosage] = useState("500 mg");
  const [frequency, setFrequency] = useState("Twice Daily (BD)");
  const [duration, setDuration] = useState("7 Days");
  const [instructions, setInstructions] = useState("Post Meals");
  const [drugAlerts, setDrugAlerts] = useState<string[]>([]);

  const drugsCatalog = PrescriptionService.getAvailableDrugs();

  const handleDrugChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDrug(val);
    if (val) {
      const alerts = PrescriptionService.checkAlerts(val, patientAllergies);
      setDrugAlerts(alerts);
      
      // Auto-set default dosage configurations based on drug
      if (val.includes("Drops")) {
        setDosage("4 drops");
        setFrequency("Twice Daily (BD)");
        setInstructions("Instill in canal");
      } else if (val.includes("Paracetamol")) {
        setDosage("650 mg");
        setFrequency("Four Times Daily (QDS)");
        setInstructions("PRN for fever");
      } else if (val.includes("1000mg") || val.includes("augmentin")) {
        setDosage("1000 mg");
        setFrequency("Twice Daily (BD)");
      } else {
        setDosage("500 mg");
        setFrequency("Once Daily (OD)");
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
    
    // Reset inputs
    setSelectedDrug("");
    setDrugAlerts([]);
  };

  const isApproved = prescription.status === "approved";

  return (
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

      {/* Adding Form */}
      {!isApproved && (
        <form onSubmit={handleAddDrug} className="space-y-4 border-b border-gray-200 pb-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <Select
              label="SELECT DRUG FROM E-CATALOG"
              value={selectedDrug}
              onChange={handleDrugChange}
              required
            >
              <option value="">-- Choose Medication --</option>
              {drugsCatalog.map((drug) => (
                <option key={drug} value={drug}>
                  {drug}
                </option>
              ))}
            </Select>

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

          {/* Real-time Interaction Warning Alerts */}
          {drugAlerts.length > 0 && (
            <div className="space-y-2 text-left animate-fade-in-up">
              {drugAlerts.map((alert, idx) => (
                <Alert key={idx} type={alert.includes("CRITICAL") ? "error" : "warning"} titleText="DRUG SENSITIVITY FLAG">
                  {alert}
                </Alert>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedDrug || drugAlerts.some(a => a.includes("CRITICAL"))}
              className="tracking-wider font-bold"
            >
              ADD TO PRESCRIPTION
            </Button>
          </div>
        </form>
      )}

      {/* Added Medications Table */}
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

        {/* Action Signature Drawer */}
        {!isApproved && prescription.medications.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <Button variant="primary" onClick={onApprove} className="tracking-wider font-bold text-xs py-3 px-6">
              APPROVE & SECURELY SIGN PRESCRIPTION
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
