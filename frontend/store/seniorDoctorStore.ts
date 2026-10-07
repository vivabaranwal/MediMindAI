import { create } from "zustand";
import useSWR, { mutate } from "swr";
import apiClient from "@/services/apiClient";
import { AiService } from "@/services/ai.service";
import { toApiError } from "@/lib/errors";
import { triageToAcuity } from "@/lib/risk";
import {
  FollowUpPlan,
  JuniorDoctorAssessment,
  Patient,
  Prescription,
  PrescriptionMedication,
  Recommendation,
  SOAPNote,
  UploadedReport,
} from "@/types/senior-doctor";
import { AiBriefDto, ReportDto, SuggestionsDto } from "@/types/ai";

/** Each AI-backed section loads independently and can fail without breaking the page. */
export interface Section<T> {
  status: "idle" | "loading" | "ready" | "error";
  data?: T;
  error?: string;
  code?: string;
}

interface AiState {
  brief: Section<AiBriefDto>;
  suggestions: Section<SuggestionsDto>;
}

const IDLE: AiState = { brief: { status: "idle" }, suggestions: { status: "idle" } };

interface SeniorDoctorStore {
  patients: Patient[];
  activePatientId: number | null;
  assessments: Record<number, JuniorDoctorAssessment>;
  recommendations: Record<number, Recommendation[]>;
  ai: Record<number, AiState>;
  soapNotes: Record<number, SOAPNote>;
  prescriptions: Record<number, Prescription>;
  followups: Record<number, FollowUpPlan>;

  selectPatient: (patientId: number | null) => void;
  updateRecommendationStatus: (
    patientId: number,
    recId: string,
    status: "pending" | "accepted" | "modified" | "rejected",
    modifiedValue?: string,
  ) => void;
  updateSoap: (patientId: number, fields: Partial<SOAPNote>) => void;
  approveSoap: (patientId: number) => void;
  addMedication: (patientId: number, med: PrescriptionMedication) => void;
  removeMedication: (patientId: number, medId: string) => void;
  updateMedication: (patientId: number, medId: string, fields: Partial<PrescriptionMedication>) => void;
  approvePrescription: (patientId: number) => void;
  setPrescriptionDiagnosis: (patientId: number, diagnosis: string) => void;
  saveFollowUp: (patientId: number, timeframe: FollowUpPlan["timeframe"], instructions: string, customDays?: string) => void;
  completeConsultation: (patientId: number) => void;

  // Data loading (all throw ApiError on failure)
  fetchDashboardData: (doctorId: number) => Promise<void>;
  loadEncounterForPatient: (patientId: number) => Promise<void>;
  /** Load the stored AI brief, generating it if none exists. `regenerate` forces a fresh one. Never throws; state carries the error. */
  loadBrief: (patientId: number, regenerate?: boolean) => Promise<void>;
  /** Generate decision-support suggestions (cached for the session unless `force`). Never throws. */
  loadSuggestions: (patientId: number, force?: boolean) => Promise<void>;

  saveSoapDraft: (encounterId: number, fields: { subjective?: string; objective?: string; assessment?: string; plan?: string }) => Promise<unknown>;
  signSoapNote: (encounterId: number) => Promise<unknown>;
  savePrescriptionDraft: (encounterId: number, medications: PrescriptionMedication[], instructions?: string, followupDate?: string, diagnosis?: string) => Promise<{ success: boolean; data?: { id: number } }>;
  approvePrescriptionApi: (prescriptionId: number, acknowledgeCritical?: boolean) => Promise<unknown>;
  completeConsultationApi: (encounterId: number) => Promise<unknown>;
}

// ----------------------------------------------------------------------------- helpers

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

const mapReport = (r: ReportDto): UploadedReport => ({
  id: String(r.id),
  reportId: r.id,
  name: r.file_name,
  type: r.file_name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
  uploadedAt: new Date(r.uploaded_at ?? r.created_at).toLocaleDateString(),
  status: r.status,
  analysisError: r.analysis_error,
  documentType: r.ai_findings?.document_type ?? null,
  summary: r.ai_summary,
  values: r.ai_findings?.values ?? [],
  abnormalities: r.ai_findings?.abnormalities ?? [],
  observations: r.ai_findings?.observations ?? [],
  warnings: r.ai_findings?.warnings ?? [],
});

/** Vitals exactly as recorded; absent fields stay absent. */
const mapVitals = (v: Record<string, unknown> | null | undefined): Patient["vitals"] | undefined => {
  if (!v) return undefined;
  const out: NonNullable<Patient["vitals"]> = {};
  if (v.bp) out.bp = String(v.bp);
  if (v.hr !== undefined && v.hr !== null && v.hr !== "") out.hr = Number(v.hr);
  if (v.temp !== undefined && v.temp !== null && v.temp !== "") out.temp = String(v.temp);
  if (v.spo2 !== undefined && v.spo2 !== null && v.spo2 !== "") out.spo2 = Number(v.spo2);
  return Object.keys(out).length ? out : undefined;
};

const mapPatientBase = (p: any, appt: any | null, encounter: any | null): Patient => {
  const status: Patient["status"] =
    appt?.status === "completed" || encounter?.status === "completed" ? "Completed" : encounter || appt?.status === "in_consultation" ? "In Review" : "Waiting";
  return {
    id: p.id,
    token: appt?.slot_token ?? encounter?.appointment?.slot_token ?? 0,
    code: p.patient_code || `PT-${p.id}`,
    name: p.name || "Unknown patient",
    age: p.age ?? 0,
    gender: p.gender || "Other",
    status,
    acuity: triageToAcuity(appt?.triage_level ?? encounter?.appointment?.triage_level),
    chiefComplaint: appt?.chief_complaint ?? encounter?.appointment?.chief_complaint ?? "",
    assignedDoctor: appt?.doctor?.user?.name ?? encounter?.doctor?.user?.name ?? "",
    contact: p.mobile ?? "",
    address: p.address ?? "",
    medicalHistory: asList(p.medical_history),
    allergies: Array.isArray(p.allergies) ? p.allergies.map((a: { allergen: string }) => a.allergen) : [],
    currentMedications: asList(p.current_medications),
    previousVisits: [],
    uploadedReports: [],
    encounterId: encounter?.id,
    appointmentId: appt?.id ?? encounter?.appointment_id,
  };
};

const toRecommendations = (s: SuggestionsDto): Recommendation[] => [
  ...s.differentials.map((d, i): Recommendation => ({
    id: `dx-${i}`,
    type: "diagnosis",
    title: d.diagnosis,
    detail: d.rationale,
    likelihood: d.likelihood,
    evidence: d.supporting_findings.length ? d.supporting_findings.join("; ") : "No supporting findings cited.",
    status: "pending",
  })),
  ...s.investigations.map((inv, i): Recommendation => ({
    id: `inv-${i}`, type: "investigation", title: inv.name, detail: inv.rationale, evidence: inv.rationale, status: "pending",
  })),
  ...s.medications.map((m, i): Recommendation => ({
    id: `med-${i}`,
    type: "medication",
    title: `${m.name} ${m.dosage}`.trim(),
    detail: `${m.frequency}, ${m.duration}. ${m.instructions}`.trim(),
    evidence: [...m.cautions, ...m.alerts.map((a) => a.message)].join(" ") || "No cautions recorded.",
    status: "pending",
  })),
];

const emptyRx = (patientId: number): Prescription => ({ patientId, selectedDiagnosis: "", medications: [], status: "draft" });

// ----------------------------------------------------------------------------- store

export const useSeniorDoctorStore = create<SeniorDoctorStore>((set, get) => {
  const setAi = (patientId: number, patch: Partial<AiState>) =>
    set((state) => ({ ai: { ...state.ai, [patientId]: { ...(state.ai[patientId] ?? IDLE), ...patch } } }));

  return {
    patients: [],
    activePatientId: null,
    assessments: {},
    recommendations: {},
    ai: {},
    soapNotes: {},
    prescriptions: {},
    followups: {},

    selectPatient: (patientId) => set({ activePatientId: patientId }),

    updateRecommendationStatus: (patientId, recId, status, modifiedValue) =>
      set((state) => ({
        recommendations: {
          ...state.recommendations,
          [patientId]: (state.recommendations[patientId] || []).map((r) => (r.id === recId ? { ...r, status, modifiedValue } : r)),
        },
      })),

    updateSoap: (patientId, fields) =>
      set((state) => ({
        soapNotes: {
          ...state.soapNotes,
          [patientId]: { ...(state.soapNotes[patientId] ?? { patientId, subjective: "", objective: "", assessment: "", plan: "", status: "draft" }), ...fields },
        },
      })),

    approveSoap: (patientId) =>
      set((state) => {
        const existing = state.soapNotes[patientId];
        return existing ? { soapNotes: { ...state.soapNotes, [patientId]: { ...existing, status: "approved" as const } } } : {};
      }),

    addMedication: (patientId, med) =>
      set((state) => {
        const existing = state.prescriptions[patientId] ?? emptyRx(patientId);
        return { prescriptions: { ...state.prescriptions, [patientId]: { ...existing, medications: [...existing.medications, med] } } };
      }),

    removeMedication: (patientId, medId) =>
      set((state) => {
        const existing = state.prescriptions[patientId];
        return existing
          ? { prescriptions: { ...state.prescriptions, [patientId]: { ...existing, medications: existing.medications.filter((m) => m.id !== medId) } } }
          : {};
      }),

    updateMedication: (patientId, medId, fields) =>
      set((state) => {
        const existing = state.prescriptions[patientId];
        return existing
          ? { prescriptions: { ...state.prescriptions, [patientId]: { ...existing, medications: existing.medications.map((m) => (m.id === medId ? { ...m, ...fields } : m)) } } }
          : {};
      }),

    setPrescriptionDiagnosis: (patientId, diagnosis) =>
      set((state) => ({
        prescriptions: { ...state.prescriptions, [patientId]: { ...(state.prescriptions[patientId] ?? emptyRx(patientId)), selectedDiagnosis: diagnosis } },
      })),

    approvePrescription: (patientId) =>
      set((state) => {
        const existing = state.prescriptions[patientId];
        return existing ? { prescriptions: { ...state.prescriptions, [patientId]: { ...existing, status: "approved" as const } } } : {};
      }),

    saveFollowUp: (patientId, timeframe, instructions, customDays) =>
      set((state) => ({
        followups: { ...state.followups, [patientId]: { patientId, timeframe, instructions, customDays, status: "saved" as const } },
      })),

    completeConsultation: (patientId) =>
      set((state) => ({ patients: state.patients.map((p) => (p.id === patientId ? { ...p, status: "Completed" as const } : p)) })),

    // ------------------------------------------------------------------ loading

    fetchDashboardData: async (doctorId) => {
      try {
        const [resEnc, resQueue] = await Promise.all([
          apiClient.get("/encounters", { params: { completed: "today" } }), // so cases signed off today stay listed as Completed
          apiClient.get("/appointments/queue", { params: { doctor_id: doctorId } }),
        ]);
        const encounters: any[] = resEnc.data?.data || [];
        const queue: any[] = (resQueue.data?.data || []).filter((a: any) => a.status !== "booked");

        const patients: Patient[] = queue.map((appt) => {
          const encounter =
            encounters.find((e) => e.appointment_id === appt.id) ??
            encounters.find((e) => e.patient_id === appt.patient_id && e.status !== "completed") ??
            null;
          return mapPatientBase(appt.patient ?? { id: appt.patient_id }, appt, encounter);
        });

        // Active encounters whose appointment has left the queue still need a row.
        encounters.forEach((enc) => {
          if (!patients.some((p) => p.id === enc.patient_id)) {
            patients.push(mapPatientBase(enc.patient ?? { id: enc.patient_id }, null, enc));
          }
        });

        set({ patients });
      } catch (err) {
        throw toApiError(err, "Could not load the clinical queue.");
      }
    },

    loadEncounterForPatient: async (patientId) => {
      try {
        // Include completed encounters so a signed-off case can still be opened (e.g. to print the prescription).
        const encounters: any[] = (await apiClient.get("/encounters", { params: { completed: "all" } })).data?.data || [];
        const encounter =
          encounters.find((e) => e.patient_id === patientId && e.status !== "completed") ??
          encounters.find((e) => e.patient_id === patientId);
        if (!encounter) throw new Error("No active encounter found for this patient.");
        const encounterId: number = encounter.id;

        const [detailRes, patientRes, reportsRes] = await Promise.all([
          apiClient.get(`/encounters/${encounterId}`),
          apiClient.get(`/patients/${patientId}`),
          apiClient.get("/reports", { params: { patient_id: patientId } }),
        ]);
        const detail = detailRes.data?.data ?? {};
        const patientData = patientRes.data?.data ?? {};
        const reports: ReportDto[] = reportsRes.data?.data ?? [];

        // Existing prescription draft, if any (404 simply means none yet).
        let rx: Prescription = emptyRx(patientId);
        try {
          const rxRes = await apiClient.get("/prescriptions", { params: { encounter_id: encounterId } });
          const d = rxRes.data?.data;
          if (d) {
            rx = {
              patientId,
              selectedDiagnosis: d.diagnosis ?? "",
              medications: (d.medicines || []).map((m: any, i: number) => ({
                id: m.id || `med-${i}-${d.id}`,
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                instructions: m.instructions || "",
                alerts: [],
              })),
              status: d.doctor_approved ? "approved" : "draft",
              dbId: d.id,
            };
          }
        } catch (err) {
          if (toApiError(err).status !== 404) throw err;
        }

        const base = mapPatientBase(patientData, detail.appointment ?? null, detail);
        const sym = detail.symptom?.symptoms ?? {};
        const patient: Patient = {
          ...base,
          vitals: mapVitals(sym.vitals),
          uploadedReports: reports.map(mapReport),
          aiConsent: Boolean(patientData.ai_consent),
          encounterId,
          appointmentId: detail.appointment_id,
        };

        const answered = (sym.questions ?? []).filter((q: any) => q.status !== "rejected" && String(q.answer ?? "").trim() !== "");
        const summary = sym.summary ?? null;
        const assessment: JuniorDoctorAssessment = {
          chiefComplaint: patient.chiefComplaint ?? "",
          summary: summary
            ? { subjective: summary.subjective ?? "", timeline: summary.timeline ?? "", clinicalNotes: summary.clinical_notes ?? "", redFlags: summary.red_flags ?? [] }
            : undefined,
          positives: summary?.symptoms ?? [],
          negatives: summary?.negatives ?? [],
          questionsAnswered: answered.map((q: any) => ({ id: String(q.id), text: q.text, answer: q.answer, category: q.category || "General" })),
        };

        set((state) => ({
          patients: state.patients.some((p) => p.id === patientId)
            ? state.patients.map((p) => (p.id === patientId ? patient : p))
            : [...state.patients, patient],
          prescriptions: { ...state.prescriptions, [patientId]: rx },
          assessments: { ...state.assessments, [patientId]: assessment },
        }));

        // Fire-and-forget: the page renders now; the brief fills in when ready.
        if ((get().ai[patientId] ?? IDLE).brief.status === "idle") void get().loadBrief(patientId);
      } catch (err) {
        throw toApiError(err, "Could not load this patient's record.");
      }
    },

    loadBrief: async (patientId, regenerate = false) => {
      const patient = get().patients.find((p) => p.id === patientId);
      if (!patient?.encounterId) return;
      setAi(patientId, { brief: { status: "loading", data: get().ai[patientId]?.brief.data } });
      try {
        let brief = regenerate ? null : await AiService.getBrief(patient.encounterId);
        if (!brief) brief = await AiService.generateBrief(patient.encounterId);
        setAi(patientId, { brief: { status: "ready", data: brief } });
      } catch (err) {
        const e = toApiError(err, "Could not load the AI brief.");
        setAi(patientId, { brief: { status: "error", error: e.message, code: e.code, data: get().ai[patientId]?.brief.data } });
      }
    },

    loadSuggestions: async (patientId, force = false) => {
      const patient = get().patients.find((p) => p.id === patientId);
      const current = (get().ai[patientId] ?? IDLE).suggestions;
      if (!patient?.encounterId || current.status === "loading" || (!force && current.status === "ready")) return;
      setAi(patientId, { suggestions: { status: "loading" } });
      try {
        const s = await AiService.suggestions(patient.encounterId);
        set((state) => ({ recommendations: { ...state.recommendations, [patientId]: toRecommendations(s) } }));
        setAi(patientId, { suggestions: { status: "ready", data: s } });
      } catch (err) {
        const e = toApiError(err, "Could not generate suggestions.");
        setAi(patientId, { suggestions: { status: "error", error: e.message, code: e.code } });
      }
    },

    // ------------------------------------------------------------------ writes

    saveSoapDraft: async (encounterId, fields) => {
      try {
        return (await apiClient.put(`/encounters/${encounterId}/soap`, fields)).data;
      } catch (err) {
        throw toApiError(err, "Failed to save the SOAP draft.");
      }
    },

    signSoapNote: async (encounterId) => {
      try {
        return (await apiClient.post(`/encounters/${encounterId}/sign`)).data;
      } catch (err) {
        throw toApiError(err, "Failed to sign the SOAP note.");
      }
    },

    savePrescriptionDraft: async (encounterId, medications, instructions = "Take as directed", followupDate, diagnosis) => {
      try {
        const res = await apiClient.post("/prescriptions", {
          encounter_id: encounterId,
          medicines: medications.map((m) => ({
            name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.instructions,
          })),
          instructions,
          followup_date: followupDate,
          diagnosis: diagnosis?.trim() || undefined, // omitted = leave the saved diagnosis untouched
        });
        return res.data;
      } catch (err) {
        throw toApiError(err, "Failed to save the prescription draft.");
      }
    },

    approvePrescriptionApi: async (prescriptionId, acknowledgeCritical = false) => {
      try {
        return (await apiClient.post(`/prescriptions/${prescriptionId}/approve`, { acknowledge_critical: acknowledgeCritical })).data;
      } catch (err) {
        throw toApiError(err, "Failed to approve the prescription.");
      }
    },

    completeConsultationApi: async (encounterId) => {
      try {
        return (await apiClient.post(`/encounters/${encounterId}/complete`)).data;
      } catch (err) {
        throw toApiError(err, "Failed to complete the consultation.");
      }
    },
  };
});

// ----------------------------------------------------------------------------- SOAP hook

/**
 * Loads the stored SOAP note for an encounter. `null` data means "not generated yet" (not an
 * error). `generate()` asks the AI to draft one and refreshes.
 */
export function useSoapNote(encounterId: number | undefined | null, patientId: number) {
  const updateSoap = useSeniorDoctorStore((s) => s.updateSoap);
  const key = encounterId ? `/encounters/${encounterId}/soap` : null;

  const swr = useSWR(key, () => AiService.getSoap(encounterId as number), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onSuccess: (note) => {
      if (note) {
        updateSoap(patientId, {
          subjective: note.subjective || "",
          objective: note.objective || "",
          assessment: note.assessment || "",
          plan: note.plan || "",
          status: note.doctor_signed ? "approved" : "draft",
        });
      }
    },
  });

  const generate = async () => {
    if (!encounterId) return;
    await AiService.generateSoap(encounterId); // throws ApiError
    await mutate(key);
  };

  return { ...swr, generate };
}

if (typeof window !== "undefined") {
  window.addEventListener("SOAP_GENERATED", (e: Event) => {
    const encId = (e as CustomEvent<{ encounterId?: number }>).detail?.encounterId;
    if (encId) {
      mutate(`/encounters/${encId}/soap`);
    }
  });
}
