import { Patient } from "@/types/junior-doctor";

export const AssessmentService = {
  getPatientVitals: async (patientId: number) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Simulated values based on clinical state
    if (patientId === 3) {
      return { bp: "135/88", hr: 94, temp: "101.2 °F", spo2: 97 };
    }
    if (patientId === 5) {
      return { bp: "148/95", hr: 102, temp: "99.1 °F", spo2: 95 };
    }
    return { bp: "120/80", hr: 72, temp: "98.6 °F", spo2: 99 };
  },

  getClinicalGuidelines: () => {
    return [
      {
        title: "OTITIS MEDIA EXCLUSION RULES",
        description: "Requires acute onset of symptoms, middle ear effusion (MEE) signs, and prominent tympanic membrane bulging.",
      },
      {
        title: "MASTOIDITIS WARNING RED FLAGS",
        description: "Tenderness behind the pinna, erythema, swelling, or displacement of the auricle. Requires immediate senior notification.",
      },
      {
        title: "DPDP DATA PRIVACY STANDARDS",
        description: "Ensure no direct identifiers like contact details are captured in speech-to-text dictation fields.",
      },
    ];
  },
};
