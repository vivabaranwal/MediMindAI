export const FollowUpService = {
  getDefaultInstructions: (timeframe: string): string => {
    switch (timeframe) {
      case "3":
        return "Complete clinical re-evaluation in 3 days. Return to emergency care if fever does not subside or facial asymmetry develops.";
      case "7":
        return "Standard post-infectious review in 7 days to evaluate resolution of effusion and tympanic membrane healing.";
      case "14":
        return "Check hearing status and verify complete resolution of inflammatory exudates after 2 weeks.";
      case "30":
        return "Routine check-in and pure-tone audiometry screening to verify resolution of any temporary hearing loss.";
      default:
        return "Complete follow-up review as instructed. Seek emergency care immediately if red-flag symptoms emerge.";
    }
  },
};
