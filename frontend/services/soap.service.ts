import { SOAPNote, Patient } from "@/types/senior-doctor";

export const SoapService = {
  generateDefaultSoap: (patient: Patient, juniorAssessment?: any): SOAPNote => {
    const subjective = `Subjective:
Patient reports chief complaint of "${patient.chiefComplaint || 'Consultation check-in'}".
Junior assessment notes: "${juniorAssessment?.notes || 'No notes compiled.'}"
Allergies checked: ${patient.allergies?.join(", ") || 'None documented'}.`;

    const objective = `Objective:
Vitals Checked:
- BP: ${patient.vitals?.bp || "--"}
- HR: ${patient.vitals?.hr ? `${patient.vitals.hr} bpm` : "--"}
- Temp: ${patient.vitals?.temp || "--"}
- SpO2: ${patient.vitals?.spo2 ? `${patient.vitals.spo2}%` : "--"}
Physical Findings: Bulging tympanic membrane, postero-superior congestion. Mastoid tenderness present.`;

    const assessment = `Assessment:
Primary Differential: Acute Otitis Media / Otitis Externa.
Evidence matches visual otoscopic records and WBC counts. Mastoid tenderness requires monitoring to rule out bone erosion.`;

    const plan = `Plan:
1. Initiate second-generation oral cephalosporin (Cefuroxime) to bypass Penicillin allergy.
2. Direct patient for diagnostic audiometry post-resolution.
3. Cold compresses for otalgia symptom relief.
4. Schedule follow-up check-in in 7 days.`;

    return {
      patientId: patient.id,
      subjective,
      objective,
      assessment,
      plan,
      status: "draft",
    };
  },
};
