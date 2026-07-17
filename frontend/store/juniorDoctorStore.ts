import { create } from "zustand";
import apiClient from "@/services/apiClient";
import { Patient, Question, CaseSummary, Assessment, Doctor } from "@/types/junior-doctor";

// Initial mock doctors list for specialist handoff selection
export const mockDoctors: Doctor[] = [
  { id: "doc-1", name: "Dr. Alok Verma", specialty: "Senior Otologist", role: "Specialist" },
  { id: "doc-2", name: "Dr. Neha Shah", specialty: "ENT Consultant", role: "Specialist" },
  { id: "doc-3", name: "Dr. Sandeep Kumar", specialty: "Rhinologist", role: "Specialist" },
];

const initialPatients: Patient[] = [
  {
    id: 1,
    token: 201,
    code: "MM-2026-00045",
    name: "Ramesh Sharma",
    age: 45,
    gender: "Male",
    status: "Waiting",
    acuity: "moderate acuity",
    chiefComplaint: "",
    assignedDoctor: "",
    vitals: { bp: "125/82", hr: 78, temp: "98.4 °F", spo2: 98 },
  },
  {
    id: 3,
    token: 203,
    code: "MM-2026-00061",
    name: "Kabir Mehra",
    age: 29,
    gender: "Male",
    status: "In Assessment",
    acuity: "high acuity",
    chiefComplaint: "Severe progressive ear pain left side for 4 days with fever",
    assignedDoctor: "",
    vitals: { bp: "135/88", hr: 94, temp: "101.2 °F", spo2: 97 },
  },
  {
    id: 5,
    token: 205,
    code: "MM-2026-00084",
    name: "William D'Souza",
    age: 61,
    gender: "Male",
    status: "Waiting",
    acuity: "emergent acuity",
    chiefComplaint: "",
    assignedDoctor: "",
    vitals: { bp: "148/95", hr: 102, temp: "99.1 °F", spo2: 95 },
  },
  {
    id: 6,
    token: 206,
    code: "MM-2026-00092",
    name: "Sunita Gupta",
    age: 38,
    gender: "Female",
    status: "Completed",
    acuity: "low acuity",
    chiefComplaint: "Mild throat irritation and tickle for a week",
    assignedDoctor: "Dr. Neha Shah",
    vitals: { bp: "118/76", hr: 72, temp: "98.6 °F", spo2: 99 },
  },
];

// No mock assessments — all assessment state is initialized empty.
// Populated only when a Junior Doctor actively starts an intake session.

interface JuniorDoctorStore {
  patients: Patient[];
  activePatientId: number | null;
  assessments: Record<number, Assessment>;
  casesSentToSenior: { patientId: number; doctorId: string; timestamp: string }[];
  
  // Actions
  selectPatient: (patientId: number | null) => void;
  startAssessment: (patientId: number, chiefComplaint: string, questions: Question[], vitals?: Patient["vitals"]) => void;
  updateQuestionStatus: (patientId: number, questionId: string, status: "suggested" | "accepted" | "rejected") => void;
  updateQuestionText: (patientId: number, questionId: string, text: string) => void;
  answerQuestion: (patientId: number, questionId: string, answer: string) => void;
  setSummary: (patientId: number, summary: CaseSummary) => void;
  sendToSenior: (patientId: number, doctorId: string) => Promise<void>;
  persistAssessmentAndDispatch: (patientId: number, doctorId: string) => Promise<void>;
  resetActiveAssessment: (patientId: number) => void;
  fetchQueue: (doctorId: number) => Promise<void>;
}

export const useJuniorDoctorStore = create<JuniorDoctorStore>((set, get) => ({
  patients: [],
  activePatientId: null,
  assessments: {}, // Always starts empty; populated only from live intake sessions
  casesSentToSenior: [],

  selectPatient: (patientId) => set({ activePatientId: patientId }),

  startAssessment: (patientId, chiefComplaint, questions, vitals) =>
    set((state) => {
      const patient = state.patients.find((p) => p.id === patientId);
      const updatedPatients = state.patients.map((p) =>
        p.id === patientId
          ? {
              ...p,
              status: "In Assessment" as const,
              chiefComplaint,
              vitals: vitals ? { ...p.vitals, ...vitals } : p.vitals,
            }
          : p
      );
      return {
        patients: updatedPatients,
        assessments: {
          ...state.assessments,
          [patientId]: {
            patientId,
            chiefComplaint,
            status: "started",
            questions,
            // Stamp appointmentId so redirect logic can verify this assessment
            // belongs to the current appointment and is not stale mock data.
            appointmentId: patient?.appointmentId,
          },
        },
      };
    }),

  updateQuestionStatus: (patientId, questionId, status) =>
    set((state) => {
      const assessment = state.assessments[patientId];
      if (!assessment) return {};
      const updatedQuestions = assessment.questions.map((q) =>
        q.id === questionId ? { ...q, status } : q
      );
      return {
        assessments: {
          ...state.assessments,
          [patientId]: {
            ...assessment,
            status: "questioning",
            questions: updatedQuestions,
          },
        },
      };
    }),

  updateQuestionText: (patientId, questionId, text) =>
    set((state) => {
      const assessment = state.assessments[patientId];
      if (!assessment) return {};
      const updatedQuestions = assessment.questions.map((q) =>
        q.id === questionId ? { ...q, editedText: text, text } : q
      );
      return {
        assessments: {
          ...state.assessments,
          [patientId]: {
            ...assessment,
            questions: updatedQuestions,
          },
        },
      };
    }),

  answerQuestion: (patientId, questionId, answer) =>
    set((state) => {
      const assessment = state.assessments[patientId];
      if (!assessment) return {};
      const updatedQuestions = assessment.questions.map((q) =>
        q.id === questionId ? { ...q, answer } : q
      );
      return {
        assessments: {
          ...state.assessments,
          [patientId]: {
            ...assessment,
            questions: updatedQuestions,
          },
        },
      };
    }),

  setSummary: (patientId, summary) =>
    set((state) => {
      const assessment = state.assessments[patientId];
      if (!assessment) return {};
      return {
        assessments: {
          ...state.assessments,
          [patientId]: {
            ...assessment,
            status: "completed",
            summary,
          },
        },
      };
    }),

  persistAssessmentAndDispatch: async (patientId: number, doctorId: string) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const assessment = get().assessments[patientId];
    if (!patient || !patient.appointmentId || !assessment || !assessment.summary) {
      console.warn("Required assessment data or patient not found in store.");
      return;
    }

    // Map the local UI state to the API validation schema
    let triageLevel = "green";
    if (patient.acuity === "emergent acuity") triageLevel = "red";
    else if (patient.acuity === "high acuity") triageLevel = "amber";
    else if (patient.acuity === "moderate acuity") triageLevel = "yellow";

    const payload = {
      triage_level: triageLevel,
      chief_complaint: assessment.chiefComplaint || patient.chiefComplaint || "",
      vitals: {
        bp: patient.vitals?.bp || "120/80",
        hr: patient.vitals?.hr || 80,
        temp: patient.vitals?.temp || "98.6 °F",
        spo2: patient.vitals?.spo2 || 98
      },
      symptoms: (assessment.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        answer: q.answer || "",
        status: q.status || "suggested"
      })),
      soap_note: {
        subjective: assessment.summary?.subjective || "",
        objective: `Vitals - BP: ${patient.vitals?.bp || "120/80"}, HR: ${patient.vitals?.hr || 80}, Temp: ${patient.vitals?.temp || "98.6 °F"}, SpO2: ${patient.vitals?.spo2 || 98}`,
        assessment: assessment.summary?.clinicalNotes || "",
        plan: "Patient case queued for senior specialist review."
      }
    };

    try {
      await apiClient.post(`/appointments/${patient.appointmentId}/assessment`, payload);

      set((state) => {
        const doctor = mockDoctors.find((d) => d.id === doctorId);
        const updatedPatients = state.patients.map((p) =>
          p.id === patientId
            ? {
                ...p,
                status: "Completed" as const,
                assignedDoctor: doctor ? doctor.name : "Senior Doctor",
              }
            : p
        );

        const updatedAssessments = { ...state.assessments };
        if (updatedAssessments[patientId]) {
          updatedAssessments[patientId] = {
            ...updatedAssessments[patientId],
            sentToSeniorId: doctorId,
          };
        }

        return {
          patients: updatedPatients,
          assessments: updatedAssessments,
          casesSentToSenior: [
            ...state.casesSentToSenior,
            {
              patientId,
              doctorId,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ],
        };
      });
    } catch (err) {
      console.error("persistAssessmentAndDispatch error", err);
      throw err;
    }
  },

  sendToSenior: async (patientId, doctorId) => {
    return get().persistAssessmentAndDispatch(patientId, doctorId);
  },

  fetchQueue: async (doctorId: number) => {
    console.log(`[Store] fetchQueue initiated for doctorId: ${doctorId}`);
    try {
      const res = await apiClient.get("/appointments/queue", {
        params: { doctor_id: doctorId },
      });
      console.log("[Store] fetchQueue API response data:", res.data);
      const queue = res.data?.data || [];

      const mappedPatients = queue.map((appt: any) => {
        const patientData = appt.patient || {};
        
        let acuity: any = "low acuity";
        if (appt.triage_level === "red") acuity = "emergent acuity";
        else if (appt.triage_level === "amber" || appt.triage_level === "orange") acuity = "high acuity";
        else if (appt.triage_level === "yellow") acuity = "moderate acuity";

        let status: any = "Waiting";
        if (appt.status === "in_consultation") status = "In Assessment";
        else if (appt.status === "in_queue") status = "Completed";

        return {
          id: patientData.id || appt.patient_id,
          token: appt.slot_token || 0,
          code: patientData.code || `MM-2026-${String(patientData.id || appt.patient_id).padStart(5, "0")}`,
          name: patientData.name || "Unknown Patient",
          age: patientData.age || 0,
          gender: patientData.gender || "Other",
          status,
          acuity,
          chiefComplaint: appt.chief_complaint || "",
          assignedDoctor: appt.doctor_id === 2 ? "Dr. Neha Shah" : "Dr. Alok Verma",
          vitals: appt.vitals || { bp: "", hr: undefined, temp: "", spo2: undefined },
          appointmentId: appt.id,
          appointmentStatus: appt.status,
        };
      });

      // Hard-reset assessments alongside patients to eliminate any stale mock
      // data that could cause the redirect logic to skip the Intake form.
      set({ patients: mappedPatients, assessments: {} });
    } catch (err) {
      console.error("fetchQueue error", err);
    }
  },

  resetActiveAssessment: (patientId) =>
    set((state) => {
      const updatedAssessments = { ...state.assessments };
      delete updatedAssessments[patientId];
      const updatedPatients = state.patients.map((p) =>
        p.id === patientId ? { ...p, status: "Waiting" as const, chiefComplaint: "" } : p
      );
      return {
        patients: updatedPatients,
        assessments: updatedAssessments,
      };
    }),
}));
