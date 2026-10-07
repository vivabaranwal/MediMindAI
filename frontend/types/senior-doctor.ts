import type { Likelihood, LabValueDto, ReportDto } from "@/types/ai";

export type RiskLevel = "low acuity" | "moderate acuity" | "high acuity" | "emergent acuity";

export interface PreviousVisit {
  date: string;
  reason: string;
  diagnosis: string;
  doctor: string;
  notes: string;
}

export interface UploadedReport {
  id: string;
  reportId: number;
  name: string;
  type: "image" | "pdf";
  uploadedAt: string;
  status: ReportDto["status"];
  analysisError: string | null;
  documentType: string | null;
  summary: string | null;
  values: LabValueDto[];
  abnormalities: string[];
  observations: string[];
  /** e.g. "patient_name_mismatch", "low_confidence_ocr" */
  warnings: string[];
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
  /** Present only when recorded; never defaulted. */
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
  aiConsent?: boolean;
  encounterId?: number;
  appointmentId?: number;
}

export interface QuestionAnswered {
  id: string;
  text: string;
  answer: string;
  category: string;
}

export interface JuniorDoctorAssessment {
  chiefComplaint: string;
  /** AI intake summary produced by the junior doctor's session, if any. */
  summary?: {
    subjective: string;
    timeline: string;
    clinicalNotes: string;
    redFlags: string[];
  };
  positives: string[];
  negatives: string[];
  questionsAnswered: QuestionAnswered[];
}

export interface Recommendation {
  id: string;
  type: "diagnosis" | "investigation" | "medication" | "treatment" | "procedure" | "followup";
  title: string;
  detail: string;
  /** Qualitative likelihood from the model (diagnoses only). No fabricated percentages. */
  likelihood?: Likelihood;
  evidence: string;
  status: "pending" | "accepted" | "modified" | "rejected";
  modifiedValue?: string;
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
  /** Safety alerts from the server-side check (allergy rules + interaction review). */
  alerts: { severity: "critical" | "warning" | "info"; message: string; source: "rule" | "model" }[];
}

export interface Prescription {
  patientId: number;
  selectedDiagnosis: string;
  medications: PrescriptionMedication[];
  status: "draft" | "approved";
  dbId?: number;
}

export interface FollowUpPlan {
  patientId: number;
  timeframe: "3" | "7" | "14" | "30" | "custom";
  customDays?: string;
  instructions: string;
  status: "draft" | "saved";
}
