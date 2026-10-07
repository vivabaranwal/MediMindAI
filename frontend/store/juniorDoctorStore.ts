import { create } from "zustand";
import apiClient from "@/services/apiClient";
import { AiService, DirectoryService } from "@/services/ai.service";
import { toApiError } from "@/lib/errors";
import { acuityToRisk, acuityToTriage, riskToAcuity, triageToAcuity } from "@/lib/risk";
import { Assessment, CaseSummary, Doctor, Patient, Question } from "@/types/junior-doctor";

type Vitals = NonNullable<Patient["vitals"]>;

interface JuniorDoctorStore {
  patients: Patient[];
  activePatientId: number | null;
  assessments: Record<number, Assessment>;
  doctors: Doctor[];
  casesSentToSenior: { patientId: number; doctorId: number; timestamp: string }[];

  selectPatient: (patientId: number | null) => void;
  fetchQueue: (doctorId: number) => Promise<void>;
  fetchDoctors: () => Promise<void>;

  /** Ask the AI for intake questions and open an assessment session. Throws ApiError on failure. */
  beginAssessment: (patientId: number, chiefComplaint: string, vitals?: Vitals) => Promise<void>;
  /** Ask the AI for further questions, given what has been answered so far. Returns how many new questions were added. */
  requestMoreQuestions: (patientId: number) => Promise<number>;
  updateQuestionStatus: (patientId: number, questionId: string, status: Question["status"]) => void;
  updateQuestionText: (patientId: number, questionId: string, text: string) => void;
  answerQuestion: (patientId: number, questionId: string, answer: string) => void;
  /** Compile the AI case summary from the answered questions. Throws ApiError on failure. */
  compileSummary: (patientId: number) => Promise<void>;
  updateSummary: (patientId: number, summary: CaseSummary) => void;
  sendToSenior: (patientId: number, doctorId: number) => Promise<void>;
  resetActiveAssessment: (patientId: number) => void;
}

const answeredQa = (a: Assessment) =>
  a.questions
    .filter((q) => q.status === "accepted" && q.answer && q.answer.trim() !== "")
    .map((q) => ({ question: q.text, answer: q.answer!.trim() }));

/** Only send vitals that were actually entered. Nothing is defaulted. */
const cleanVitals = (v?: Vitals) =>
  v ? Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined && val !== "")) : undefined;

const newQuestionId = (i: number) => `q-${Date.now()}-${i}`;

export const useJuniorDoctorStore = create<JuniorDoctorStore>((set, get) => ({
  patients: [],
  activePatientId: null,
  assessments: {},
  doctors: [],
  casesSentToSenior: [],

  selectPatient: (patientId) => set({ activePatientId: patientId }),

  fetchDoctors: async () => {
    // Only seniors can receive a handoff.
    set({ doctors: await DirectoryService.doctors("senior") });
  },

  fetchQueue: async (doctorId) => {
    try {
      const res = await apiClient.get("/appointments/queue", { params: { doctor_id: doctorId } });
      const queue = res.data?.data || [];

      const patients: Patient[] = queue.map((appt: any) => {
        const p = appt.patient || {};
        return {
          id: p.id ?? appt.patient_id,
          token: appt.slot_token ?? 0,
          code: p.patient_code || `PT-${p.id ?? appt.patient_id}`,
          name: p.name || "Unknown patient",
          age: p.age ?? 0,
          gender: p.gender || "Other",
          status: appt.status === "in_consultation" ? "In Assessment" : appt.status === "in_queue" ? "Completed" : "Waiting",
          acuity: triageToAcuity(appt.triage_level),
          chiefComplaint: appt.chief_complaint || "",
          assignedDoctor: appt.doctor?.user?.name || "",
          allergies: (p.allergies || []).map((a: { allergen: string }) => a.allergen),
          appointmentId: appt.id,
          appointmentStatus: appt.status,
        };
      });

      // Keep in-progress sessions for appointments still in the queue; drop the rest.
      const liveAppointments = new Set(patients.map((p) => p.appointmentId));
      set((state) => ({
        patients,
        assessments: Object.fromEntries(
          Object.entries(state.assessments).filter(([, a]) => a.appointmentId && liveAppointments.has(a.appointmentId)),
        ),
      }));
    } catch (err) {
      throw toApiError(err, "Could not load the patient queue.");
    }
  },

  beginAssessment: async (patientId, chiefComplaint, vitals) => {
    const patient = get().patients.find((p) => p.id === patientId);
    if (!patient?.appointmentId) throw new Error("This patient has no active appointment.");

    const { questions } = await AiService.intakeQuestions(patient.appointmentId, {
      chiefComplaint,
      vitals: cleanVitals(vitals),
    });
    if (questions.length === 0) throw new Error("The AI returned no questions. Please try again or refine the complaint.");

    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, status: "In Assessment", chiefComplaint, vitals: vitals ? { ...p.vitals, ...vitals } : p.vitals } : p,
      ),
      assessments: {
        ...state.assessments,
        [patientId]: {
          patientId,
          appointmentId: patient.appointmentId,
          chiefComplaint,
          status: "started",
          questions: questions.map((q, i) => ({ id: newQuestionId(i), text: q.text, category: q.category, status: "suggested" as const })),
        },
      },
    }));
  },

  requestMoreQuestions: async (patientId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const assessment = get().assessments[patientId];
    if (!patient?.appointmentId || !assessment) throw new Error("No active assessment.");

    const { questions } = await AiService.intakeQuestions(patient.appointmentId, {
      chiefComplaint: assessment.chiefComplaint,
      vitals: cleanVitals(patient.vitals),
      // Everything already asked (answered or not) so the model does not repeat itself.
      answered: assessment.questions.map((q) => ({ question: q.text, answer: q.answer?.trim() || "(not yet answered)" })),
    });

    const known = new Set(assessment.questions.map((q) => q.text.trim().toLowerCase()));
    const fresh = questions.filter((q) => !known.has(q.text.trim().toLowerCase()));

    set((state) => ({
      assessments: {
        ...state.assessments,
        [patientId]: {
          ...state.assessments[patientId],
          questions: [
            ...state.assessments[patientId].questions,
            ...fresh.map((q, i) => ({ id: newQuestionId(i), text: q.text, category: q.category, status: "suggested" as const })),
          ],
        },
      },
    }));
    return fresh.length;
  },

  updateQuestionStatus: (patientId, questionId, status) =>
    set((state) => {
      const a = state.assessments[patientId];
      if (!a) return {};
      return {
        assessments: {
          ...state.assessments,
          [patientId]: { ...a, status: "questioning", questions: a.questions.map((q) => (q.id === questionId ? { ...q, status } : q)) },
        },
      };
    }),

  updateQuestionText: (patientId, questionId, text) =>
    set((state) => {
      const a = state.assessments[patientId];
      if (!a) return {};
      return {
        assessments: {
          ...state.assessments,
          [patientId]: { ...a, questions: a.questions.map((q) => (q.id === questionId ? { ...q, editedText: text, text } : q)) },
        },
      };
    }),

  answerQuestion: (patientId, questionId, answer) =>
    set((state) => {
      const a = state.assessments[patientId];
      if (!a) return {};
      return {
        assessments: {
          ...state.assessments,
          [patientId]: { ...a, questions: a.questions.map((q) => (q.id === questionId ? { ...q, answer } : q)) },
        },
      };
    }),

  compileSummary: async (patientId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const assessment = get().assessments[patientId];
    if (!patient?.appointmentId || !assessment) throw new Error("No active assessment.");

    const s = await AiService.intakeSummary(patient.appointmentId, {
      chiefComplaint: assessment.chiefComplaint,
      vitals: cleanVitals(patient.vitals),
      qa: answeredQa(assessment),
    });

    const acuity = riskToAcuity(s.risk_level);
    const summary: CaseSummary = {
      subjective: s.subjective,
      timeline: s.timeline,
      symptoms: s.symptoms,
      negatives: s.negatives,
      clinicalNotes: s.clinical_notes,
      riskAssessment: acuity,
      redFlags: s.red_flags,
      riskFloorApplied: s.risk_floor_applied,
    };

    set((state) => ({
      patients: state.patients.map((p) => (p.id === patientId ? { ...p, acuity } : p)),
      assessments: { ...state.assessments, [patientId]: { ...state.assessments[patientId], status: "completed", summary } },
    }));
  },

  updateSummary: (patientId, summary) =>
    set((state) => {
      const a = state.assessments[patientId];
      if (!a) return {};
      return {
        patients: state.patients.map((p) => (p.id === patientId ? { ...p, acuity: summary.riskAssessment } : p)),
        assessments: { ...state.assessments, [patientId]: { ...a, summary } },
      };
    }),

  sendToSenior: async (patientId, doctorId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const assessment = get().assessments[patientId];
    if (!patient?.appointmentId || !assessment?.summary) throw new Error("The case summary has not been compiled.");
    const summary = assessment.summary;

    try {
      await apiClient.post(`/appointments/${patient.appointmentId}/assessment`, {
        triage_level: acuityToTriage(summary.riskAssessment),
        chief_complaint: assessment.chiefComplaint || patient.chiefComplaint || "",
        doctor_id: doctorId,
        vitals: cleanVitals(patient.vitals),
        symptoms: assessment.questions.map((q) => ({
          id: q.id, text: q.text, category: q.category, answer: q.answer || "", status: q.status,
        })),
        summary: {
          subjective: summary.subjective,
          timeline: summary.timeline,
          symptoms: summary.symptoms,
          negatives: summary.negatives,
          clinical_notes: summary.clinicalNotes,
          risk_level: acuityToRisk(summary.riskAssessment),
          red_flags: summary.redFlags,
        },
      });
    } catch (err) {
      throw toApiError(err, "Handoff failed.");
    }

    set((state) => {
      const doctor = state.doctors.find((d) => d.id === doctorId);
      return {
        patients: state.patients.map((p) =>
          p.id === patientId ? { ...p, status: "Completed", assignedDoctor: doctor?.name ?? p.assignedDoctor } : p,
        ),
        assessments: { ...state.assessments, [patientId]: { ...state.assessments[patientId], sentToSeniorId: doctorId } },
        casesSentToSenior: [
          ...state.casesSentToSenior,
          { patientId, doctorId, timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) },
        ],
      };
    });
  },

  resetActiveAssessment: (patientId) =>
    set((state) => {
      const assessments = { ...state.assessments };
      delete assessments[patientId];
      return {
        assessments,
        patients: state.patients.map((p) => (p.id === patientId ? { ...p, status: "Waiting" as const, chiefComplaint: "" } : p)),
      };
    }),
}));
