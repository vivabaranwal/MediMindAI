export interface ClinicalGuideline {
  id: string;
  source: string;
  recommendation: string;
  levelOfEvidence: string;
}

export const ClinicalReviewService = {
  getGuidelinesForComplaint: (complaint: string): ClinicalGuideline[] => {
    const query = complaint.toLowerCase();
    
    if (query.includes("ear") || query.includes("mastoid") || query.includes("otitis")) {
      return [
        {
          id: "g-1",
          source: "AAO-HNS 2022 Guidelines on AOM",
          recommendation: "First-line treatment in adults with systemic symptoms is high-dose amoxicillin-clavulanate. For penicillin-allergic patients, cefuroxime axetil or clindamycin is recommended.",
          levelOfEvidence: "Grade A",
        },
        {
          id: "g-2",
          source: "National Clinical Pathway for Mastoiditis",
          recommendation: "Coalescent mastoiditis requires emergent specialist consultation, intravenous broad-spectrum coverage, and surgical decompression (mastoidectomy) if bone erosion is present.",
          levelOfEvidence: "Grade A",
        },
      ];
    }

    return [
      {
        id: "g-gen-1",
        source: "Standard Clinical Workflow protocol",
        recommendation: "Obtain localized physical exam parameters, review diagnostic scopes, and cross-examine patient allergies before finalizing plans.",
        levelOfEvidence: "Grade C",
      },
    ];
  },
};
