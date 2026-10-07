/** Shapes returned by the Laravel API for AI features (mirrors the AI engine contract). */

export type ApiRisk = "low" | "medium" | "high" | "critical";
export type Likelihood = "high" | "moderate" | "low";

export interface AiMeta {
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number;
  prompt_version: string;
}

export interface IntakeQuestionDto {
  text: string;
  category: string;
}

export interface IntakeSummaryDto {
  subjective: string;
  timeline: string;
  symptoms: string[];
  negatives: string[];
  clinical_notes: string;
  risk_level: ApiRisk;
  risk_floor_applied: boolean;
  red_flags: string[];
  meta: AiMeta;
}

export interface AiBriefDto {
  id: number;
  encounter_id: number;
  brief_text: string;
  risk_level: ApiRisk;
  risk_rationale: string | null;
  red_flags: string[] | null;
  suggested_questions: string[] | null;
  llm_model_used: string | null;
  token_count: number | null;
  generation_time_ms: number | null;
  created_at: string;
}

export interface DifferentialDto {
  diagnosis: string;
  likelihood: Likelihood;
  rationale: string;
  supporting_findings: string[];
}

export interface AlertDto {
  severity: "critical" | "warning" | "info";
  medication: string;
  message: string;
  source: "rule" | "model";
}

export interface MedicationSuggestionDto {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  cautions: string[];
  alerts: AlertDto[];
}

export interface SuggestionsDto {
  differentials: DifferentialDto[];
  investigations: { name: string; rationale: string }[];
  medications: MedicationSuggestionDto[];
  meta: AiMeta;
}

export interface CitationDto {
  source_id: string;
  label: string;
  snippet: string;
}

export interface ChatAnswerDto {
  answer: string;
  citations: CitationDto[];
  insufficient_information: boolean;
}

export interface DoctorDto {
  id: number;
  name: string;
  specialization: string | null;
  level: "junior" | "senior";
}

export interface SoapDto {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  doctor_signed: boolean;
  is_ai_generated: boolean;
}

export interface LabValueDto {
  name: string;
  value: string;
  unit: string | null;
  reference_range: string | null;
  flag: "normal" | "low" | "high" | "critical" | "unknown";
}

export interface ReportDto {
  id: number;
  report_type: string;
  file_name: string;
  status: "pending_analysis" | "analyzing" | "analyzed" | "failed" | "not_analyzed";
  analysis_error: string | null;
  ai_summary: string | null;
  ai_findings: {
    document_type: string;
    report_date: string | null;
    patient_name_detected: string | null;
    values: LabValueDto[];
    abnormalities: string[];
    observations: string[];
    warnings: string[];
  } | null;
  uploaded_at: string | null;
  created_at: string;
}
