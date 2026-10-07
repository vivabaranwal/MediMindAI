import React from "react";

export interface PrintablePatient {
  code: string;
  name: string;
  age: number | string | null;
  gender: string;
  allergies?: string[];
}

export interface PrintablePrescription {
  /** The diagnosis: the issue being treated. */
  selectedDiagnosis?: string;
  medications: { id: string; name: string; dosage: string; frequency: string; duration: string; instructions: string }[];
}

interface PrescriptionPrintSheetProps {
  patient: PrintablePatient;
  prescription: PrintablePrescription;
  doctorName: string;
  /** When the doctor signed it (ISO string). Defaults to today. */
  signedAt?: string | null;
  /** What the patient came in with. */
  complaint?: string | null;
  rxNo?: string | null;
  /** General advice for the patient. */
  advice?: string | null;
  /** e.g. "14 October 2026" or "After 7 days". */
  followUp?: string | null;
}

/**
 * The signed prescription on an A4 sheet (210 x 297 mm). The same sheet is the on-screen preview and
 * the only thing printed (the page hides everything else when printing; globals.css sets @page to A4).
 * It carries prescribing information only: no AI alerts or internal notes.
 */
export const PrescriptionPrintSheet: React.FC<PrescriptionPrintSheetProps> = ({
  patient,
  prescription,
  doctorName,
  signedAt,
  complaint,
  rxNo,
  advice,
  followUp,
}) => {
  const date = (signedAt ? new Date(signedAt) : new Date()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const diagnosis = prescription.selectedDiagnosis?.trim();

  // The screen preview is a full A4 page. When printing, the browser margins (15 mm) replace the padding.
  return (
    <div
      className="bg-white text-black flex flex-col w-[210mm] min-h-[297mm] p-[15mm] print:w-auto print:min-h-[267mm] print:p-0"
      data-testid="prescription-print-sheet"
    >
      <div className="flex justify-between items-start border-b-2 border-black pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MEDIMIND CLINIC</h1>
          <p className="text-sm">ENT Specialist Care</p>
        </div>
        <div className="text-right text-sm leading-snug">
          <p>Date: {date}</p>
          {rxNo && <p>Rx No: {rxNo}</p>}
          <p>Patient ID: {patient.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm py-4 border-b border-gray-400">
        <p>
          <span className="font-bold">Patient:</span> {patient.name}
        </p>
        <p>
          <span className="font-bold">Age / Sex:</span> {patient.age ?? "?"} years / {patient.gender || "?"}
        </p>
        <p className="col-span-2">
          <span className="font-bold">Known allergies:</span>{" "}
          {patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None documented"}
        </p>
      </div>

      <div className="py-4 border-b border-gray-400 space-y-3 text-sm">
        {complaint && (
          <p>
            <span className="font-bold">Presenting complaint:</span> {complaint}
          </p>
        )}
        <div className="border border-black rounded-sm px-3 py-2 break-inside-avoid">
          <p className="text-[11px] font-bold uppercase tracking-wider">Diagnosis</p>
          <p className="text-base font-semibold">{diagnosis || "Not recorded"}</p>
        </div>
      </div>

      <div className="py-4">
        <p className="text-3xl font-serif font-bold mb-3">&#8478;</p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 pr-3 w-8">#</th>
              <th className="py-2 pr-3">Medicine</th>
              <th className="py-2 pr-3">Dose</th>
              <th className="py-2 pr-3">Frequency</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {prescription.medications.map((m, i) => (
              <tr key={m.id} className="border-b border-gray-300 align-top break-inside-avoid">
                <td className="py-2 pr-3">{i + 1}</td>
                <td className="py-2 pr-3 font-bold">{m.name}</td>
                <td className="py-2 pr-3">{m.dosage}</td>
                <td className="py-2 pr-3">{m.frequency}</td>
                <td className="py-2 pr-3">{m.duration}</td>
                <td className="py-2">{m.instructions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(advice || followUp) && (
        <div className="text-sm space-y-1 pb-4 break-inside-avoid">
          {advice && (
            <p>
              <span className="font-bold">Advice:</span> {advice}
            </p>
          )}
          {followUp && (
            <p>
              <span className="font-bold">Follow-up:</span> {followUp}
            </p>
          )}
        </div>
      )}

      {/* mt-auto pins the signature and footer to the bottom of the A4 page */}
      <div className="mt-auto break-inside-avoid">
        <div className="flex justify-end pt-12 pb-6">
          <div className="text-center text-sm w-64">
            <div className="border-t border-black pt-1">
              <p className="font-bold">{doctorName}</p>
              <p>Signed electronically on {date}</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 pt-3 border-t border-gray-300">
          This prescription is valid only when signed by the prescribing doctor. Take medicines as directed. Return or call the clinic if symptoms worsen.
        </p>
      </div>
    </div>
  );
};
