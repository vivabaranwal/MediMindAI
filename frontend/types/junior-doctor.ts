export type AcuityLevel = "low acuity" | "moderate acuity" | "high acuity" | "emergent acuity";

export type AssessmentStatus = "Waiting" | "In Assessment" | "Completed";

export interface Patient {
  id: number;
  token: number;
  code: string;
  name: string;
  age: number;
  gender: string;
  status: AssessmentStatus;
  acuity: AcuityLevel;
  chiefComplaint?: string;
  assignedDoctor?: string;
  notes?: string;
  allergies?: string[];
  vitals?: {
    bp?: string;
    hr?: number;
    temp?: string;
    spo2?: number;
  };
  appointmentId?: number;
  appointmentStatus?: string;
}

export interface Question {
  id: string;
  text: string;
  category: string;
  status: "suggested" | "accepted" | "rejected";
  answer?: string;
  editedText?: string;
}

export interface Assessment {
  patientId: number;
  appointmentId?: number; // Stamped on creation to verify ownership, prevents stale data from another appointment
  chiefComplaint: string;
  questions: Question[];
  currentQuestionIndex?: number;
  status: "started" | "questioning" | "completed";
  summary?: CaseSummary;
  sentToSeniorId?: number;
}

export interface CaseSummary {
  subjective: string;
  timeline: string;
  symptoms: string[];
  negatives: string[];
  clinicalNotes: string;
  riskAssessment: AcuityLevel;
  /** Red flags detected from the answers by the safety rules (not by the model). */
  redFlags: string[];
  /** True when the safety rules raised the risk above what the model proposed. */
  riskFloorApplied: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string | null;
}
