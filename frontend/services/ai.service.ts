import apiClient from "@/services/apiClient";
import { toApiError } from "@/lib/errors";
import {
  AiBriefDto,
  AlertDto,
  ChatAnswerDto,
  DoctorDto,
  IntakeQuestionDto,
  IntakeSummaryDto,
  SoapDto,
  SuggestionsDto,
} from "@/types/ai";

interface Qa {
  question: string;
  answer: string;
}

interface VitalsInput {
  bp?: string;
  hr?: number;
  temp?: string | number;
  spo2?: number;
}

/** Run an API call and return `data.data`, converting any failure into an ApiError. */
async function call<T>(request: Promise<{ data: { data: T } }>, fallback: string): Promise<T> {
  try {
    return (await request).data.data;
  } catch (err) {
    throw toApiError(err, fallback);
  }
}

export const AiService = {
  // ---- junior doctor intake (appointment scoped)
  intakeQuestions: (
    appointmentId: number,
    input: { chiefComplaint: string; vitals?: VitalsInput; answered?: Qa[]; maxQuestions?: number },
  ) =>
    call<{ questions: IntakeQuestionDto[] }>(
      apiClient.post(`/appointments/${appointmentId}/intake/questions`, {
        chief_complaint: input.chiefComplaint,
        vitals: input.vitals,
        answered: input.answered ?? [],
        max_questions: input.maxQuestions,
      }),
      "Could not generate intake questions.",
    ),

  intakeSummary: (appointmentId: number, input: { chiefComplaint: string; vitals?: VitalsInput; qa: Qa[] }) =>
    call<IntakeSummaryDto>(
      apiClient.post(`/appointments/${appointmentId}/intake/summary`, {
        chief_complaint: input.chiefComplaint,
        vitals: input.vitals,
        qa: input.qa,
      }),
      "Could not compile the case summary.",
    ),

  // ---- senior doctor (encounter scoped)
  getBrief: async (encounterId: number): Promise<AiBriefDto | null> => {
    try {
      return (await apiClient.get(`/ai/briefs/${encounterId}`)).data.data;
    } catch (err) {
      const e = toApiError(err, "Could not load the AI brief.");
      if (e.code === "brief_not_generated") return null;
      throw e;
    }
  },

  generateBrief: (encounterId: number) =>
    call<AiBriefDto>(apiClient.post(`/ai/briefs/${encounterId}/regenerate`), "Could not generate the AI brief."),

  suggestions: (encounterId: number) =>
    call<SuggestionsDto>(apiClient.post(`/encounters/${encounterId}/suggestions`), "Could not generate clinical suggestions."),

  chat: (encounterId: number, query: string, history: { role: "user" | "assistant"; content: string }[]) =>
    call<ChatAnswerDto>(apiClient.post(`/encounters/${encounterId}/chat`, { query, history }), "The assistant could not answer."),

  checkPrescription: (patientId: number, diagnosis: string | undefined, medications: { name: string; dosage?: string; frequency?: string; duration?: string }[]) =>
    call<{ alerts: AlertDto[]; model_check: { status: "ok" | "skipped" | "unavailable"; reason: string | null } }>(
      apiClient.post("/prescriptions/check", { patient_id: patientId, diagnosis, medications }),
      "Could not run the prescription safety check.",
    ),

  // ---- SOAP
  getSoap: async (encounterId: number): Promise<SoapDto | null> => {
    try {
      return (await apiClient.get(`/encounters/${encounterId}/soap`)).data.data;
    } catch (err) {
      const e = toApiError(err, "Could not load the SOAP note.");
      if (e.code === "soap_not_generated") return null;
      throw e;
    }
  },

  generateSoap: (encounterId: number) =>
    call<SoapDto>(apiClient.post(`/encounters/${encounterId}/soap/generate`), "Could not generate the SOAP draft."),

  // ---- reports
  reanalyzeReport: (reportId: number) =>
    call<unknown>(apiClient.post(`/reports/${reportId}/reanalyze`), "Could not restart report analysis."),
};

export const DirectoryService = {
  doctors: (level?: "junior" | "senior") =>
    call<DoctorDto[]>(apiClient.get("/doctors", { params: level ? { level } : undefined }), "Could not load the doctor list."),
};
