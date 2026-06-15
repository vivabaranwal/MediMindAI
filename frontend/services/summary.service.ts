import { Question, CaseSummary, AcuityLevel } from "@/types/junior-doctor";

export const SummaryService = {
  compileSummary: async (
    chiefComplaint: string,
    questions: Question[],
    initialAcuity: AcuityLevel
  ): Promise<CaseSummary> => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate AI summary compilation

    const acceptedQuestions = questions.filter((q) => q.status === "accepted");
    const symptoms: string[] = [];
    const negatives: string[] = [];

    acceptedQuestions.forEach((q) => {
      const ans = q.answer || "";
      if (ans.trim() === "") return;

      const isPositive =
        ans.toLowerCase().startsWith("yes") ||
        ans.toLowerCase().includes("present") ||
        ans.toLowerCase().includes("confirmed") ||
        (ans.length > 3 && !ans.toLowerCase().startsWith("no ") && ans.toLowerCase() !== "no");

      if (isPositive) {
        symptoms.push(`${q.text} -> ${ans}`);
      } else {
        negatives.push(`${q.text} -> Denied/Negative (${ans})`);
      }
    });

    // Check if red flags were accepted and answered positively to suggest elevated risk
    let finalAcuity = initialAcuity;
    const redFlagQuestions = acceptedQuestions.filter((q) => q.category === "Red Flags");
    const hasActiveRedFlags = redFlagQuestions.some(
      (q) => q.answer && (q.answer.toLowerCase().startsWith("yes") || q.answer.toLowerCase().includes("tender"))
    );

    if (hasActiveRedFlags) {
      if (initialAcuity === "low acuity") finalAcuity = "moderate acuity";
      else if (initialAcuity === "moderate acuity") finalAcuity = "high acuity";
      else if (initialAcuity === "high acuity") finalAcuity = "emergent acuity";
    }

    const subjective = `Patient presents with chief complaint of: "${chiefComplaint}". Details compiled from AI-guided diagnostic questioning workflow.`;
    
    const timeline = `Symptom duration and progression: Symptoms are described as active. No history of prior clinical complications reported in the immediate timeline.`;

    const clinicalNotes = `Clinical Evaluation Summary:
The patient's chief complaint is consistent with localized inflammatory response.
Vitals checked and reviewed. Identified ${symptoms.length} clinical markers.
Relevant clinical negatives compiled for differential diagnostic exclusion.
Recommended specialist consultation for further otoscopic/rhinologic visualization.`;

    return {
      subjective,
      timeline,
      symptoms: symptoms.length > 0 ? symptoms : ["No positive symptoms documented."],
      negatives: negatives.length > 0 ? negatives : ["No relevant negatives documented."],
      clinicalNotes,
      riskAssessment: finalAcuity,
    };
  },
};
