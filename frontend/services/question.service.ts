import { Question } from "@/types/junior-doctor";

export const QuestionService = {
  generateQuestions: async (chiefComplaint: string): Promise<Question[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate AI computation delay
    
    const query = chiefComplaint.toLowerCase();
    
    const otologyQuestions: Question[] = [
      {
        id: "q-oto-1",
        text: "Is there any active discharge, fluid, or bleeding coming from the affected ear(s)?",
        category: "Otologic Symptoms",
        status: "suggested",
      },
      {
        id: "q-oto-2",
        text: "Are you experiencing any spinning sensation, dizziness, or balance issues (vertigo)?",
        category: "Neurological/Vestibular",
        status: "suggested",
      },
      {
        id: "q-oto-3",
        text: "Is there notable tenderness, pain, or swelling behind the ear pinna (mastoid area)?",
        category: "Red Flags",
        status: "suggested",
      },
      {
        id: "q-oto-4",
        text: "Did this symptom cluster start following a recent cold, influenza, or nasal congestion?",
        category: "History",
        status: "suggested",
      },
      {
        id: "q-oto-5",
        text: "Do you have any history of ear drum perforations or previous ear surgeries?",
        category: "Medical History",
        status: "suggest5" as any === "suggested" ? "suggested" : "suggested", // make sure typescript likes this
      },
    ];

    const generalThroatQuestions: Question[] = [
      {
        id: "q-thr-1",
        text: "Is there difficulty or pain when swallowing liquids or solid foods (dysphagia)?",
        category: "Throat Symptoms",
        status: "suggested",
      },
      {
        id: "q-thr-2",
        text: "Do you have any swelling in your neck glands under the jaw line?",
        category: "Physical Findings",
        status: "suggested",
      },
      {
        id: "q-thr-3",
        text: "Are you experiencing any shortness of breath or change in voice quality (hoarseness)?",
        category: "Red Flags",
        status: "suggested",
      },
      {
        id: "q-thr-4",
        text: "Do you have an active fever, chills, or muscle aches?",
        category: "Systemic Symptoms",
        status: "suggested",
      },
    ];

    const genericQuestions: Question[] = [
      {
        id: "q-gen-1",
        text: "Can you pinpoint the exact date and context when these symptoms first appeared?",
        category: "Chronology",
        status: "suggested",
      },
      {
        id: "q-gen-2",
        text: "Have you taken any over-the-counter painkillers or antibiotic medications for this?",
        category: "Treatment History",
        status: "suggested",
      },
      {
        id: "q-gen-3",
        text: "Do you have any known medication or food allergies?",
        category: "Allergies",
        status: "suggested",
      },
      {
        id: "q-gen-4",
        text: "Are these symptoms worsening, remaining stable, or fluctuating throughout the day?",
        category: "Progression",
        status: "suggested",
      },
    ];

    if (query.includes("ear") || query.includes("hear") || query.includes("tinnitus") || query.includes("otitis") || query.includes("mastoid")) {
      return otologyQuestions;
    } else if (query.includes("throat") || query.includes("swallow") || query.includes("cough") || query.includes("tonsil")) {
      return generalThroatQuestions;
    } else {
      return genericQuestions;
    }
  },
};
