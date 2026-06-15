import { PrescriptionMedication } from "@/types/senior-doctor";

export const PrescriptionService = {
  checkAlerts: (medicationName: string, patientAllergies: string[]): string[] => {
    const alerts: string[] = [];
    const medLower = medicationName.toLowerCase();
    
    // Penicillin check
    const isPenicillinAllergic = patientAllergies.some(a => a.toLowerCase().includes("penicillin"));
    if (isPenicillinAllergic) {
      if (medLower.includes("amoxicillin") || medLower.includes("penicillin") || medLower.includes("ampicillin") || medLower.includes("augmentin")) {
        alerts.push(`CRITICAL ALERT: Patient is allergic to Penicillin. Prescribing ${medicationName} is contraindicated.`);
      }
      if (medLower.includes("cef") || medLower.includes("ceftriaxone") || medLower.includes("cefuroxime")) {
        alerts.push(`WARNING: Cross-sensitivity risk. Cefuroxime/Cephalosporins have minor cross-reactivity in penicillin-allergic patients.`);
      }
    }

    // Sulfa check
    const isSulfaAllergic = patientAllergies.some(a => a.toLowerCase().includes("sulfa"));
    if (isSulfaAllergic && (medLower.includes("bactrim") || medLower.includes("sulfamethoxazole"))) {
      alerts.push(`CRITICAL ALERT: Patient is allergic to Sulfa drugs. Prescribing ${medicationName} is contraindicated.`);
    }

    return alerts;
  },

  getAvailableDrugs: (): string[] => {
    return [
      "Amoxicillin-Clavulanate 1000mg",
      "Cefuroxime Axetil 500mg",
      "Clindamycin 300mg",
      "Ciprofloxacin 0.3% Ear Drops",
      "Paracetamol 650mg",
      "Ibuprofen 400mg",
      "Bactrim DS",
      "IV Ceftriaxone",
      "IV Piperacillin-Tazobactam",
    ];
  },

  generatePrescriptionPDF: async (patientName: string, medications: PrescriptionMedication[]): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate PDF rendering
    return `SECURE_EMR_PRESCRIPTION_SHA256_HASH_VAL_FOR_${patientName.replace(/\s+/g, "_").toUpperCase()}`;
  }
};
