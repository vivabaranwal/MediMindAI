/**
 * Search suggestions for the prescription builder. This is a convenience list, not a safety
 * control: any medicine can be typed in, and every medicine (listed or not) goes through the
 * same server-side allergy and interaction check.
 *
 * Known limitation: this should become a clinic-managed formulary table.
 */
export const FORMULARY: string[] = [
  "Amoxicillin-Clavulanate 1000mg",
  "Cefuroxime Axetil 500mg",
  "Clindamycin 300mg",
  "Azithromycin 500mg",
  "Ciprofloxacin 0.3% Ear Drops",
  "Paracetamol 650mg",
  "Ibuprofen 400mg",
  "Bactrim DS",
  "IV Ceftriaxone",
  "IV Piperacillin-Tazobactam",
];
