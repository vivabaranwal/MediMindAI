import { ApiRisk } from "@/types/ai";
import { AcuityLevel } from "@/types/junior-doctor";

const RISK_TO_ACUITY: Record<ApiRisk, AcuityLevel> = {
  low: "low acuity",
  medium: "moderate acuity",
  high: "high acuity",
  critical: "emergent acuity",
};

const ACUITY_TO_RISK: Record<AcuityLevel, ApiRisk> = {
  "low acuity": "low",
  "moderate acuity": "medium",
  "high acuity": "high",
  "emergent acuity": "critical",
};

const ACUITY_TO_TRIAGE: Record<AcuityLevel, string> = {
  "low acuity": "green",
  "moderate acuity": "yellow",
  "high acuity": "amber",
  "emergent acuity": "red",
};

const TRIAGE_TO_ACUITY: Record<string, AcuityLevel> = {
  green: "low acuity",
  yellow: "moderate acuity",
  amber: "high acuity",
  orange: "high acuity",
  red: "emergent acuity",
};

export const riskToAcuity = (risk: ApiRisk): AcuityLevel => RISK_TO_ACUITY[risk];
export const acuityToRisk = (acuity: AcuityLevel): ApiRisk => ACUITY_TO_RISK[acuity];
export const acuityToTriage = (acuity: AcuityLevel): string => ACUITY_TO_TRIAGE[acuity];
export const triageToAcuity = (triage: string | null | undefined): AcuityLevel =>
  (triage && TRIAGE_TO_ACUITY[triage]) || "low acuity";
