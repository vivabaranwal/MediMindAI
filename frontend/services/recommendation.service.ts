import { Recommendation } from "@/types/senior-doctor";

export const RecommendationService = {
  getSuggestedInvestigations: async (complaint: string): Promise<string[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const query = complaint.toLowerCase();
    if (query.includes("ear") || query.includes("mastoid")) {
      return ["Diagnostic Otoscopy", "Tympanometry (impedance test)", "CT Temporal Bone (High Resolution)", "Pure Tone Audiometry"];
    }
    return ["Complete Blood Count (CBC)", "Basic Metabolic Panel (BMP)"];
  },

  getSuggestedMedications: async (complaint: string, allergies: string[]): Promise<any[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const hasPenicillinAllergy = allergies.some(a => a.toLowerCase().includes("penicillin"));
    const query = complaint.toLowerCase();
    
    if (hasPenicillinAllergy) {
      return [
        { name: "Cefuroxime Axetil 500mg", dosage: "500 mg", frequency: "Once Daily (OD)", duration: "10 Days", instructions: "Post Meals", alerts: ["Cephalosporin - verify no history of severe anaphylaxis with penicillin."] },
        { name: "Clindamycin 300mg", dosage: "300 mg", frequency: "Three Times Daily (TDS)", duration: "7 Days", instructions: "With plenty of water", alerts: ["Monitor for gastrointestinal distress / diarrhea."] }
      ];
    }
    
    if (query.includes("ear") || query.includes("otitis")) {
      return [
        { name: "Amoxicillin-Clavulanate 1000mg", dosage: "1 g", frequency: "Twice Daily (BD)", duration: "10 Days", instructions: "With food", alerts: [] },
        { name: "Ciprofloxacin 0.3% Ear Drops", dosage: "4 drops", frequency: "Twice Daily (BD)", duration: "7 Days", instructions: "Instill in left ear canal", alerts: [] }
      ];
    }
    
    return [
      { name: "Paracetamol 650mg", dosage: "650 mg", frequency: "Four Times Daily (QDS)", duration: "5 Days", instructions: "PRN for fever/pain", alerts: [] }
    ];
  }
};
