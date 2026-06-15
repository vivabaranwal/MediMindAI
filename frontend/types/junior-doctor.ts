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
  vitals?: {
    bp?: string;
    hr?: number;
    temp?: string;
    spo2?: number;
  };
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
  chiefComplaint: string;
  questions: Question[];
  currentQuestionIndex?: number;
  status: "started" | "questioning" | "completed";
  summary?: CaseSummary;
  sentToSeniorId?: string;
}

export interface CaseSummary {
  subjective: string;
  timeline: string;
  symptoms: string[];
  negatives: string[];
  clinicalNotes: string;
  riskAssessment: AcuityLevel;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  role: string;
}
