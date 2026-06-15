import { create } from "zustand";
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

const initialAssessments: Record<number, Assessment> = {
  3: {
    patientId: 3,
    chiefComplaint: "Severe progressive ear pain left side for 4 days with fever",
    status: "questioning",
    questions: [
      {
        id: "q-1",
        text: "Is there any discharge or fluid leaking from the left ear?",
        category: "Symptoms",
        status: "accepted",
        answer: "Yes, a slight yellowish discharge started this morning.",
      },
      {
        id: "q-2",
        text: "Do you experience any dizziness, vertigo, or issues keeping balance?",
        category: "Neurological",
        status: "accepted",
        answer: "No vertigo, but feeling slightly lightheaded from the fever.",
      },
      {
        id: "q-3",
        text: "Is there any tenderness or pain when pressing on the bone behind your left ear?",
        category: "Red Flags",
        status: "accepted",
        answer: "",
      },
      {
        id: "q-4",
        text: "Have you had a recent cold, nasal congestion, or sore throat?",
        category: "History",
        status: "suggested",
      },
    ],
  },
};

interface JuniorDoctorStore {
  patients: Patient[];
  activePatientId: number | null;
  assessments: Record<number, Assessment>;
  casesSentToSenior: { patientId: number; doctorId: string; timestamp: string }[];
  
  // Actions
  selectPatient: (patientId: number | null) => void;
  startAssessment: (patientId: number, chiefComplaint: string, questions: Question[]) => void;
  updateQuestionStatus: (patientId: number, questionId: string, status: "suggested" | "accepted" | "rejected") => void;
  updateQuestionText: (patientId: number, questionId: string, text: string) => void;
  answerQuestion: (patientId: number, questionId: string, answer: string) => void;
  setSummary: (patientId: number, summary: CaseSummary) => void;
  sendToSenior: (patientId: number, doctorId: string) => void;
  resetActiveAssessment: (patientId: number) => void;
}

export const useJuniorDoctorStore = create<JuniorDoctorStore>((set) => ({
  patients: initialPatients,
  activePatientId: null,
  assessments: initialAssessments,
  casesSentToSenior: [],

  selectPatient: (patientId) => set({ activePatientId: patientId }),

  startAssessment: (patientId, chiefComplaint, questions) =>
    set((state) => {
      const updatedPatients = state.patients.map((p) =>
        p.id === patientId ? { ...p, status: "In Assessment" as const, chiefComplaint } : p
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

  sendToSenior: (patientId, doctorId) =>
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
    }),

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
