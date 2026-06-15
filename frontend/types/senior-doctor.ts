export type RiskLevel = "low acuity" | "moderate acuity" | "high acuity" | "emergent acuity";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface PreviousVisit {
  date: string;
  reason: string;
  diagnosis: string;
  doctor: string;
  notes: string;
}

export interface UploadedReport {
  id: string;
  name: string;
  type: "image" | "pdf";
  uploadedAt: string;
  ocrFindings: string;
  extractedLabValues: Record<string, string>;
  abnormalFindings: string[];
  clinicalObservations: string;
}

export interface Patient {
  id: number;
  token: number;
  code: string;
  name: string;
  age: number;
  gender: string;
  status: "Waiting" | "In Review" | "Completed";
  acuity: RiskLevel;
  chiefComplaint?: string;
  assignedDoctor?: string;
  vitals?: {
    bp?: string;
    hr?: number;
    temp?: string;
    spo2?: number;
  };
  contact?: string;
  address?: string;
  medicalHistory?: string[];
  allergies?: string[];
  currentMedications?: string[];
  previousVisits?: PreviousVisit[];
  uploadedReports?: UploadedReport[];
}

export interface QuestionAnswered {
  id: string;
  text: string;
  answer: string;
  category: string;
}

export interface JuniorDoctorAssessment {
  chiefComplaint: string;
  notes: string;
  timeline: string;
  positives: string[];
  negatives: string[];
  questionsAnswered: QuestionAnswered[];
}

export interface Diagnosis {
  code: string;
  name: string;
  confidence: number;
  description: string;
  rationale: string;
}

export interface Recommendation {
  id: string;
  type: "diagnosis" | "investigation" | "medication" | "treatment" | "procedure" | "followup";
  title: string;
  detail: string;
  confidence: number; // percentage (e.g. 94 for 94%)
  evidence: string;
  status: "pending" | "accepted" | "modified" | "rejected";
  modifiedValue?: string;
}

export interface SimilarCase {
  id: string;
  caseCode: string;
  similarityPercent: number;
  outcomeSummary: string;
  treatmentsUsed: string[];
  recoveryTime: string;
  recurrenceRate: string;
  complications: string;
}

export interface OutcomeStatistic {
  metricName: string;
  value: string;
  description: string;
}

export interface SOAPNote {
  patientId: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: "draft" | "approved";
}

export interface PrescriptionMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  alerts: string[];
}

export interface Prescription {
  patientId: number;
  selectedDiagnosis: string;
  medications: PrescriptionMedication[];
  status: "draft" | "approved";
}

export interface FollowUpPlan {
  patientId: number;
  timeframe: "3" | "7" | "14" | "30" | "custom";
  customDays?: string;
  instructions: string;
  status: "draft" | "saved";
}
