import { create } from "zustand";
import {
  Patient,
  JuniorDoctorAssessment,
  Recommendation,
  SimilarCase,
  OutcomeStatistic,
  SOAPNote,
  Prescription,
  FollowUpPlan,
  PrescriptionMedication,
} from "@/types/senior-doctor";

const mockPatients: Patient[] = [
  {
    id: 3,
    token: 301,
    code: "MM-2026-00061",
    name: "Kabir Mehra",
    age: 29,
    gender: "Male",
    status: "Waiting",
    acuity: "high acuity",
    chiefComplaint: "Severe progressive ear pain left side for 4 days with fever",
    vitals: { bp: "135/88", hr: 94, temp: "101.2 °F", spo2: 97 },
    contact: "+91 98765 43210",
    address: "B-24, Indira Nagar, Lucknow, UP",
    medicalHistory: ["Childhood asthma", "Allergic rhinitis"],
    allergies: ["Penicillin (moderate rash)"],
    currentMedications: ["Montelukast 10mg OD"],
    previousVisits: [
      {
        date: "14-Jan-2025",
        reason: "Acute rhinopharyngitis",
        diagnosis: "Common Cold",
        doctor: "Dr. Sandeep Kumar",
        notes: "Nasal congestion and mild throat pain. Advised saline rinses.",
      },
    ],
    uploadedReports: [
      {
        id: "rep-1",
        name: "Left_Ear_Canal_Otoscopy.jpg",
        type: "image",
        uploadedAt: "15-Jun-2026 12:45",
        ocrFindings: "Visualized tympanic membrane. Prominent bulging in postero-superior quadrant. Erythematous canal wall. Loss of light reflex.",
        extractedLabValues: { "WBC Count": "12.4 x10^9/L (High)", "CRP": "24 mg/L (High)" },
        abnormalFindings: ["Tympanic membrane bulging", "Leukocytosis", "Elevated CRP"],
        clinicalObservations: "Signs are consistent with moderate to severe middle ear inflammation.",
      },
    ],
  },
  {
    id: 5,
    token: 302,
    code: "MM-2026-00084",
    name: "William D'Souza",
    age: 61,
    gender: "Male",
    status: "In Review",
    acuity: "emergent acuity",
    chiefComplaint: "Swelling and tenderness behind left ear, auricle displacement",
    vitals: { bp: "148/95", hr: 102, temp: "99.1 °F", spo2: 95 },
    contact: "+91 99330 88221",
    address: "Civil Lines, Lucknow, UP",
    medicalHistory: ["Type 2 Diabetes Mellitus", "Hypertension"],
    allergies: ["Sulfa drugs (severe urticaria)"],
    currentMedications: ["Metformin 500mg BD", "Amlodipine 5mg OD"],
    previousVisits: [
      {
        date: "03-Mar-2026",
        reason: "Recurrent otitis media check",
        diagnosis: "Chronic Suppurative Otitis Media",
        doctor: "Dr. Alok Verma",
        notes: "Persistent discharge. Ear drops prescribed.",
      },
    ],
    uploadedReports: [
      {
        id: "rep-2",
        name: "Temporal_Bone_CT_Scan.pdf",
        type: "pdf",
        uploadedAt: "15-Jun-2026 13:10",
        ocrFindings: "CT Temporal bone: Opacification of the left mastoid air cells with septal breakdown. Cortical thinning.",
        extractedLabValues: { "Blood Glucose": "165 mg/dL (High)", "HbA1c": "7.4% (Elevated)" },
        abnormalFindings: ["Mastoid air cell opacification", "Mastoid septal erosion"],
        clinicalObservations: "Highly suspicious for coalescent mastoiditis.",
      },
    ],
  },
  {
    id: 1,
    token: 303,
    code: "MM-2026-00045",
    name: "Ramesh Sharma",
    age: 45,
    gender: "Male",
    status: "Completed",
    acuity: "moderate acuity",
    chiefComplaint: "Progressive hearing loss in left ear for 3 weeks",
    vitals: { bp: "125/82", hr: 78, temp: "98.4 °F", spo2: 98 },
    contact: "+91 94550 12345",
    address: "Aliganj, Lucknow, UP",
    medicalHistory: ["Hyperlipidemia"],
    allergies: ["None documented"],
    currentMedications: ["Atorvastatin 10mg OD"],
    previousVisits: [],
    uploadedReports: [],
  },
];

const mockAssessments: Record<number, JuniorDoctorAssessment> = {
  3: {
    chiefComplaint: "Severe progressive ear pain left side for 4 days with fever",
    notes: "Patient checked in with active pain scoring 8/10. Fevers up to 101.5°F. Junior doctor notes clear middle ear fluid behind a bulging drum.",
    timeline: "Pain started 4 days ago. Fever developed yesterday. Discharge began today.",
    positives: ["Throbbing left earache", "Yellowish fluid discharge", "Mastoid tenderness"],
    negatives: ["No vertigo", "No vomiting", "No neck stiffness"],
    questionsAnswered: [
      {
        id: "q-1",
        category: "Otologic Symptoms",
        text: "Is there any active discharge, fluid, or bleeding coming from the affected ear(s)?",
        answer: "Yes, a slight yellowish discharge started this morning.",
      },
      {
        id: "q-2",
        category: "Neurological/Vestibular",
        text: "Are you experiencing any spinning sensation, dizziness, or balance issues (vertigo)?",
        answer: "No vertigo, but feeling slightly lightheaded from the fever.",
      },
      {
        id: "q-3",
        category: "Red Flags",
        text: "Is there notable tenderness or swelling behind the ear pinna (mastoid area)?",
        answer: "Mild tenderness on pressure, no overt post-auricular swelling.",
      },
    ],
  },
  5: {
    chiefComplaint: "Swelling and tenderness behind left ear, auricle displacement",
    notes: "Elderly diabetic patient with intense retro-auricular pain. Auricle displaced forwards and downwards. Fluctuant swelling present.",
    timeline: "Ear infection symptoms for 2 weeks. Post-auricular swelling noticed 2 days ago.",
    positives: ["Displaced auricle", "Mastoid fluctuations", "Sore throat", "Fever"],
    negatives: ["No cranial nerve deficits", "No neck stiffness"],
    questionsAnswered: [
      {
        id: "q-a-1",
        category: "Symptoms",
        text: "Is there displacement of the outer ear forwards or downwards?",
        answer: "Yes, left ear is displaced outwards and downwards.",
      },
      {
        id: "q-a-2",
        category: "Red Flags",
        text: "Do you have any facial weakness or difficulty moving your facial muscles?",
        answer: "No facial symmetry issues detected.",
      },
    ],
  },
};

const mockRecommendations: Record<number, Recommendation[]> = {
  3: [
    {
      id: "rec-3-1",
      type: "diagnosis",
      title: "Acute Otitis Media (AOM) - Left Ear",
      detail: "Clinical markers match bulging tympanic membrane, fever, and acute discharge.",
      confidence: 94,
      evidence: "Otoscopic scan finding 'bulging postero-superior quadrant' and CRP level '24 mg/L'.",
      status: "pending",
    },
    {
      id: "rec-3-2",
      type: "diagnosis",
      title: "Otitis Externa - Left Ear",
      detail: "Differs by absence of severe canal stenosis. Lower probability.",
      confidence: 42,
      evidence: "Erythematous canal wall, however, TM bulging indicates primary tympanic origin.",
      status: "pending",
    },
    {
      id: "rec-3-3",
      type: "investigation",
      title: "Diagnostic Otoscopy and Tympanometry",
      detail: "Evaluate compliance and middle ear pressure parameters.",
      confidence: 88,
      evidence: "Confirm middle ear effusion presence and pressure curves.",
      status: "pending",
    },
    {
      id: "rec-3-4",
      type: "medication",
      title: "Cefuroxime Axetil 500mg OD",
      detail: "Oral cephalosporin. Safe alternative given patient Penicillin allergy.",
      confidence: 90,
      evidence: "Indicated for AOM in patients with non-severe penicillin reactions.",
      status: "pending",
    },
    {
      id: "rec-3-5",
      type: "treatment",
      title: "Warm compress and analgesic hydration protocol",
      detail: "Supportive therapy for symptomatic pain control.",
      confidence: 85,
      evidence: "Standard clinical care for pain management in acute otitis.",
      status: "pending",
    },
  ],
  5: [
    {
      id: "rec-5-1",
      type: "diagnosis",
      title: "Coalescent Mastoiditis",
      detail: "Post-auricular displacement, tenderness, and CT opacification indicators confirm severe infection.",
      confidence: 98,
      evidence: "Mastoid opacification with septal erosion on CT scan and clinical auricle displacement.",
      status: "pending",
    },
    {
      id: "rec-5-2",
      type: "procedure",
      title: "Emergency Myringotomy & Mastoidectomy",
      detail: "Surgical drainage to prevent intracranial spread of infection.",
      confidence: 95,
      evidence: "Coalescent mastoiditis is a surgical indication.",
      status: "pending",
    },
    {
      id: "rec-5-3",
      type: "medication",
      title: "IV Ceftriaxone + Clindamycin",
      detail: "Broad spectrum coverage for mastoid flora. Sulfonamide-free choice.",
      confidence: 92,
      evidence: "Empirical antibiotic regimen for acute surgical mastoiditis.",
      status: "pending",
    },
  ],
};

const mockSimilarCases: Record<number, SimilarCase[]> = {
  3: [
    {
      id: "sc-3-1",
      caseCode: "MM-2025-08122",
      similarityPercent: 92,
      outcomeSummary: "AOM with purulent drainage resolved completely.",
      treatmentsUsed: ["Cefdinir 300mg BD for 10 days", "Ibuprofen 400mg TDS"],
      recoveryTime: "6 Days",
      recurrenceRate: "Low (<5%)",
      complications: "Temporary mild conductive hearing loss resolving in 2 weeks.",
    },
    {
      id: "sc-3-2",
      caseCode: "MM-2025-09015",
      similarityPercent: 81,
      outcomeSummary: "Early stage AOM, resolved without effusion.",
      treatmentsUsed: ["Amoxicillin 875mg BD", "Paracetamol 650mg TDS"],
      recoveryTime: "4 Days",
      recurrenceRate: "Moderate (12%)",
      complications: "None.",
    },
  ],
  5: [
    {
      id: "sc-5-1",
      caseCode: "MM-2024-03120",
      similarityPercent: 96,
      outcomeSummary: "Coalescent mastoiditis in a diabetic patient.",
      treatmentsUsed: ["Cortical mastoidectomy", "IV Piperacillin-Tazobactam for 14 days"],
      recoveryTime: "21 Days",
      recurrenceRate: "Very Low (<2%)",
      complications: "Partial hearing loss, resolved in 3 months.",
    },
  ],
};

const mockOutcomeStats: Record<number, OutcomeStatistic[]> = {
  3: [
    { metricName: "Resolution Rate", value: "96%", description: "Successful resolution with second-generation oral cephalosporins." },
    { metricName: "Average Recovery Time", value: "5.8 Days", description: "Duration until complete cessation of otalgia and discharge." },
    { metricName: "Mastoid Extension Risk", value: "1.2%", description: "Incidence of progression to bone involvement." },
  ],
  5: [
    { metricName: "Surgical Cure Rate", value: "98.5%", description: "Post-operative healing after mastoidectomy." },
    { metricName: "Intracranial Spread Risk", value: "0.4%", description: "Risk of progression to meningitis or sinus thrombosis after surgery." },
  ],
};

interface SeniorDoctorStore {
  patients: Patient[];
  activePatientId: number | null;
  assessments: Record<number, JuniorDoctorAssessment>;
  recommendations: Record<number, Recommendation[]>;
  similarCases: Record<number, SimilarCase[]>;
  outcomeStats: Record<number, OutcomeStatistic[]>;
  soapNotes: Record<number, SOAPNote>;
  prescriptions: Record<number, Prescription>;
  followups: Record<number, FollowUpPlan>;

  // Actions
  selectPatient: (patientId: number | null) => void;
  updateRecommendationStatus: (
    patientId: number,
    recId: string,
    status: "pending" | "accepted" | "modified" | "rejected",
    modifiedValue?: string
  ) => void;
  updateSoap: (patientId: number, fields: Partial<SOAPNote>) => void;
  approveSoap: (patientId: number) => void;
  addMedication: (patientId: number, med: PrescriptionMedication) => void;
  removeMedication: (patientId: number, medId: string) => void;
  updateMedication: (patientId: number, medId: string, fields: Partial<PrescriptionMedication>) => void;
  approvePrescription: (patientId: number) => void;
  saveFollowUp: (patientId: number, timeframe: "3" | "7" | "14" | "30" | "custom", instructions: string, customDays?: string) => void;
  completeConsultation: (patientId: number) => void;
}

export const useSeniorDoctorStore = create<SeniorDoctorStore>((set) => ({
  patients: mockPatients,
  activePatientId: null,
  assessments: mockAssessments,
  recommendations: mockRecommendations,
  similarCases: mockSimilarCases,
  outcomeStats: mockOutcomeStats,
  soapNotes: {},
  prescriptions: {},
  followups: {},

  selectPatient: (patientId) => set({ activePatientId: patientId }),

  updateRecommendationStatus: (patientId, recId, status, modifiedValue) =>
    set((state) => {
      const recs = state.recommendations[patientId] || [];
      const updatedRecs = recs.map((r) =>
        r.id === recId ? { ...r, status, modifiedValue } : r
      );
      return {
        recommendations: {
          ...state.recommendations,
          [patientId]: updatedRecs,
        },
      };
    }),

  updateSoap: (patientId, fields) =>
    set((state) => {
      const existing = state.soapNotes[patientId] || {
        patientId,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        status: "draft",
      };
      return {
        soapNotes: {
          ...state.soapNotes,
          [patientId]: { ...existing, ...fields },
        },
      };
    }),

  approveSoap: (patientId) =>
    set((state) => {
      const existing = state.soapNotes[patientId];
      if (!existing) return {};
      return {
        soapNotes: {
          ...state.soapNotes,
          [patientId]: { ...existing, status: "approved" as const },
        },
      };
    }),

  addMedication: (patientId, med) =>
    set((state) => {
      const existing = state.prescriptions[patientId] || {
        patientId,
        selectedDiagnosis: "",
        medications: [],
        status: "draft",
      };
      return {
        prescriptions: {
          ...state.prescriptions,
          [patientId]: {
            ...existing,
            medications: [...existing.medications, med],
          },
        },
      };
    }),

  removeMedication: (patientId, medId) =>
    set((state) => {
      const existing = state.prescriptions[patientId];
      if (!existing) return {};
      return {
        prescriptions: {
          ...state.prescriptions,
          [patientId]: {
            ...existing,
            medications: existing.medications.filter((m) => m.id !== medId),
          },
        },
      };
    }),

  updateMedication: (patientId, medId, fields) =>
    set((state) => {
      const existing = state.prescriptions[patientId];
      if (!existing) return {};
      const updated = existing.medications.map((m) =>
        m.id === medId ? { ...m, ...fields } : m
      );
      return {
        prescriptions: {
          ...state.prescriptions,
          [patientId]: {
            ...existing,
            medications: updated,
          },
        },
      };
    }),

  approvePrescription: (patientId) =>
    set((state) => {
      const existing = state.prescriptions[patientId];
      if (!existing) return {};
      return {
        prescriptions: {
          ...state.prescriptions,
          [patientId]: {
            ...existing,
            status: "approved" as const,
          },
        },
      };
    }),

  saveFollowUp: (patientId, timeframe, instructions, customDays) =>
    set((state) => {
      return {
        followups: {
          ...state.followups,
          [patientId]: {
            patientId,
            timeframe,
            instructions,
            customDays,
            status: "saved" as const,
          },
        },
      };
    }),

  completeConsultation: (patientId) =>
    set((state) => {
      const updatedPatients = state.patients.map((p) =>
        p.id === patientId ? { ...p, status: "Completed" as const } : p
      );
      return {
        patients: updatedPatients,
      };
    }),
}));
