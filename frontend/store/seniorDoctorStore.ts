import { create } from "zustand";
import useSWR, { mutate } from "swr";
import apiClient from "@/services/apiClient";
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
import { SoapService } from "@/services/soap.service";

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

  // Async integration methods
  fetchDashboardData: (doctorId: number) => Promise<void>;
  loadEncounterForPatient: (patientId: number) => Promise<void>;
  saveSoapDraft: (encounterId: number, fields: { subjective?: string; objective?: string; assessment?: string; plan?: string }) => Promise<any>;
  signSoapNote: (encounterId: number) => Promise<any>;
  savePrescriptionDraft: (encounterId: number, medications: any[], instructions?: string, followupDate?: string) => Promise<any>;
  approvePrescriptionApi: (prescriptionId: number) => Promise<any>;
  regenerateBrief: (encounterId: number) => Promise<any>;
  completeConsultationApi: (encounterId: number) => Promise<any>;
}

export const useSeniorDoctorStore = create<SeniorDoctorStore>((set, get) => ({
  patients: [],
  activePatientId: null,
  assessments: {},
  recommendations: {},
  similarCases: {},
  outcomeStats: {},
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

  // Async Integration API Handlers
  fetchDashboardData: async (doctorId: number) => {
    try {
      const [resEnc, resQueue] = await Promise.all([
        apiClient.get("/encounters"),
        apiClient.get("/appointments/queue", { params: { doctor_id: doctorId } }),
      ]);

      const encounters = resEnc.data?.data || [];
      const queueAppointments = (resQueue.data?.data || []).filter(
        (appt: any) => appt.status !== "booked"
      );

      // Combine queue appointments and active encounters into Patient list
      const mappedPatients = queueAppointments.map((appt: any) => {
        const patientData = appt.patient || {};
        
        // Find matching active encounter if status is in_consultation
        const encounter = appt.status === "in_consultation" 
          ? encounters.find((e: any) => e.patient_id === appt.patient_id)
          : null;

        // Map triage levels to acuity
        let acuity: any = "low acuity";
        if (appt.triage_level === "red") acuity = "emergent acuity";
        else if (appt.triage_level === "amber" || appt.triage_level === "orange") acuity = "high acuity";
        else if (appt.triage_level === "yellow") acuity = "moderate acuity";

        let status: "Waiting" | "In Review" | "Completed" = "Waiting";
        if (appt.status === "in_consultation") status = "In Review";
        else if (appt.status === "completed") status = "Completed";

        return {
          id: patientData.id,
          token: appt.slot_token,
          code: patientData.code || `MM-2026-${String(patientData.id).padStart(5, "0")}`,
          name: patientData.name || "Unknown Patient",
          age: patientData.age || 0,
          gender: patientData.gender || "Other",
          status,
          acuity,
          chiefComplaint: appt.chief_complaint || "",
          assignedDoctor: doctorId === 1 ? "Dr. Alok Verma" : "Dr. Neha Shah",
          vitals: appt.vitals || { bp: "120/80", hr: 80, temp: "98.6 °F", spo2: 98 },
          contact: patientData.mobile || "",
          address: patientData.address || "",
          medicalHistory: patientData.medical_history ? (typeof patientData.medical_history === 'string' ? JSON.parse(patientData.medical_history) : patientData.medical_history) : [],
          allergies: patientData.allergies ? (typeof patientData.allergies === 'string' ? JSON.parse(patientData.allergies) : patientData.allergies) : [],
          currentMedications: patientData.current_medications ? (typeof patientData.current_medications === 'string' ? JSON.parse(patientData.current_medications) : patientData.current_medications) : [],
          previousVisits: [],
          uploadedReports: [],
          encounterId: encounter ? encounter.id : null,
          appointmentId: appt.id
        };
      });

      // Add patients from active encounters who are not in queue list
      encounters.forEach((enc: any) => {
        const alreadyAdded = mappedPatients.some((p: any) => p.id === enc.patient_id);
        if (!alreadyAdded) {
          const patientData = enc.patient || {};
          mappedPatients.push({
            id: patientData.id,
            token: enc.appointment?.slot_token || 0,
            code: patientData.code || `MM-2026-${String(patientData.id).padStart(5, "0")}`,
            name: patientData.name || "Unknown Patient",
            age: patientData.age || 0,
            gender: patientData.gender || "Other",
            status: "In Review",
            acuity: "moderate acuity",
            chiefComplaint: enc.appointment?.chief_complaint || "",
            assignedDoctor: doctorId === 1 ? "Dr. Alok Verma" : "Dr. Neha Shah",
            vitals: { bp: "120/80", hr: 80, temp: "98.6 °F", spo2: 98 },
            contact: patientData.mobile || "",
            address: patientData.address || "",
            medicalHistory: [],
            allergies: [],
            currentMedications: [],
            previousVisits: [],
            uploadedReports: [],
            encounterId: enc.id,
            appointmentId: enc.appointment_id
          });
        }
      });

      set({ patients: mappedPatients });
    } catch (err) {
      console.error("fetchDashboardData error", err);
    }
  },

  loadEncounterForPatient: async (patientId: number) => {
    try {
      // 1. Fetch active encounters to locate the encounter ID
      const resEnc = await apiClient.get("/encounters");
      const encounters = resEnc.data?.data || [];
      const encounter = encounters.find((e: any) => e.patient_id === patientId);

      if (!encounter) {
        throw new Error("No active encounter found for this patient.");
      }

      const encounterId = encounter.id;

      // 2. Fetch specific encounter details
      const resEncDetail = await apiClient.get(`/encounters/${encounterId}`);
      const encounterDetail = resEncDetail.data?.data || {};

      // 3. Fetch patient details
      const resPatient = await apiClient.get(`/patients/${patientId}`);
      const patientData = resPatient.data?.data || {};

      // 4. Fetch patient's uploaded reports
      const resReports = await apiClient.get("/reports", { params: { patient_id: patientId } });
      const reports = resReports.data?.data || [];
      const mappedReports = reports.map((r: any) => ({
        id: String(r.id),
        name: r.file_name,
        type: (r.file_path && r.file_path.toLowerCase().endsWith(".pdf")) ? ("pdf" as const) : ("image" as const),
        uploadedAt: new Date(r.created_at).toLocaleDateString(),
        ocrFindings: r.ocr_summary || "OCR text not compiled",
        extractedLabValues: {},
        abnormalFindings: [],
        clinicalObservations: r.ocr_summary || ""
      }));

      // Map triage levels
      let acuity: any = "low acuity";
      if (encounterDetail.appointment?.triage_level === "red") acuity = "emergent acuity";
      else if (encounterDetail.appointment?.triage_level === "amber" || encounterDetail.appointment?.triage_level === "orange") acuity = "high acuity";
      else if (encounterDetail.appointment?.triage_level === "yellow") acuity = "moderate acuity";

      const mappedPatient = {
        id: patientData.id,
        token: encounterDetail.appointment?.slot_token || 0,
        code: patientData.code,
        name: patientData.name,
        age: patientData.age || 0,
        gender: patientData.gender,
        status: (encounterDetail.status === "completed" ? "Completed" : "In Review") as any,
        acuity,
        chiefComplaint: encounterDetail.appointment?.chief_complaint || "",
        assignedDoctor: encounterDetail.doctor?.user?.name || "",
        vitals: {
          bp: encounterDetail.symptom?.symptoms?.vitals?.bp || "120/80",
          hr: encounterDetail.symptom?.symptoms?.vitals?.hr || 80,
          temp: encounterDetail.symptom?.symptoms?.vitals?.temp || "98.6 °F",
          spo2: encounterDetail.symptom?.symptoms?.vitals?.spo2 || 98
        },
        contact: patientData.mobile,
        address: patientData.address,
        medicalHistory: patientData.medical_history ? (typeof patientData.medical_history === 'string' ? JSON.parse(patientData.medical_history) : patientData.medical_history) : [],
        allergies: patientData.allergies ? (typeof patientData.allergies === 'string' ? JSON.parse(patientData.allergies) : patientData.allergies) : [],
        currentMedications: patientData.current_medications ? (typeof patientData.current_medications === 'string' ? JSON.parse(patientData.current_medications) : patientData.current_medications) : [],
        previousVisits: [],
        uploadedReports: mappedReports,
        encounterId,
        appointmentId: encounterDetail.appointment_id
      };

      // 5. Fetch SOAP Note initial empty placeholder (will be overwritten by SWR hook on page load)
      const soap = {
        patientId,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        status: "draft" as const
      };

      // 6. Fetch Prescription
      let rx: any = null;
      try {
        const resRx = await apiClient.get(`/prescriptions`, { params: { encounter_id: encounterId } });
        if (resRx.data?.success && resRx.data?.data) {
          const rxData = resRx.data.data;
          rx = {
            patientId,
            selectedDiagnosis: rxData.instructions || "Acute Otitis Media",
            medications: (rxData.medicines || []).map((m: any, idx: number) => ({
              id: m.id || `med-${idx}-${Date.now()}`,
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              instructions: m.instructions || "",
              alerts: []
            })),
            status: rxData.doctor_approved ? "approved" : "draft",
            dbId: rxData.id
          };
        }
      } catch (err) {
        rx = {
          patientId,
          selectedDiagnosis: "Acute Otitis Media",
          medications: [],
          status: "draft"
        };
      }

      // 7. Fetch AI Brief
      let recommendationsList: any[] = [];
      let casesList: any[] = [];
      let statsList: any[] = [];
      try {
        const resBrief = await apiClient.get(`/ai/briefs/${encounterId}`);
        if (resBrief.data?.success && resBrief.data?.data) {
          const brief = resBrief.data.data;
          // Map similar cases
          casesList = (brief.similar_cases || []).map((c: any, idx: number) => ({
            id: String(idx),
            caseCode: c.case_code || `CASE-${idx}`,
            similarityPercent: c.similarity || 90,
            outcomeSummary: c.outcome || "",
            treatmentsUsed: c.treatments || [],
            recoveryTime: c.recovery_time || "7 Days",
            recurrenceRate: "Low",
            complications: "None"
          }));

          // Generate recommendation blocks based on LLM suggestions
          recommendationsList = [
            {
              id: "rec-1",
              type: "diagnosis" as const,
              title: "Acute Otitis Media (AOM)",
              detail: brief.brief_text || "Clinical markers processed by AI.",
              confidence: 92,
              evidence: "OCR findings summary.",
              status: "pending" as const
            }
          ];

          // Set clinical statistics
          statsList = [
            { metricName: "Mastoid Extension Risk", value: "1.2%", description: "Incidence of progression to bone involvement." }
          ];
        }
      } catch (err) {
        console.error("AI Brief fetch error:", err);
      }

      const chiefComplaint = mappedPatient.chiefComplaint || "";
      const diagnosticKeywords = ['pain', 'fever', 'cough', 'injury', 'numbness', 'ache', 'symptom'];
      const complaintLower = chiefComplaint.toLowerCase();
      const isDiagnostic = diagnosticKeywords.some(word => complaintLower.includes(word));

      const parsedPositives = (() => {
        const questions = encounterDetail.symptom?.symptoms?.questions || [];
        const positivesList = questions
          .filter((q: any) => {
            const ans = q.answer || "";
            return ans.toLowerCase().startsWith("yes") ||
              ans.toLowerCase().includes("present") ||
              ans.toLowerCase().includes("confirmed") ||
              (ans.length > 3 && !ans.toLowerCase().startsWith("no ") && ans.toLowerCase() !== "no");
          })
          .map((q: any) => `${q.text} -> ${q.answer}`);
        return positivesList.length > 0 ? positivesList : ["No positive symptoms documented."];
      })();

      const parsedNegatives = (() => {
        const questions = encounterDetail.symptom?.symptoms?.questions || [];
        const negativesList = questions
          .filter((q: any) => {
            const ans = q.answer || "";

            // Synthesis Suppressor: Suppress "No" answers in BASELINE Mode from appearing in negatives list
            if (!isDiagnostic) {
              const ansLower = ans.toLowerCase().trim();
              if (ansLower === "no" || ansLower.startsWith("no ") || ansLower === "denied" || ansLower === "absent") {
                return false;
              }
            }

            return ans.trim() !== "" && !(
              ans.toLowerCase().startsWith("yes") ||
              ans.toLowerCase().includes("present") ||
              ans.toLowerCase().includes("confirmed") ||
              (ans.length > 3 && !ans.toLowerCase().startsWith("no ") && ans.toLowerCase() !== "no")
            );
          })
          .map((q: any) => `${q.text} -> Denied/Negative (${q.answer})`);
        return negativesList.length > 0 ? negativesList : ["No relevant negatives documented."];
      })();

      console.log("[seniorDoctorStore] loadEncounterForPatient parsedPositives:", parsedPositives);

      // Update state
      set((state) => ({
        patients: state.patients.map((p) => p.id === patientId ? mappedPatient : p),
        soapNotes: { ...state.soapNotes, [patientId]: soap },
        prescriptions: { ...state.prescriptions, [patientId]: rx },
        recommendations: { ...state.recommendations, [patientId]: recommendationsList },
        similarCases: { ...state.similarCases, [patientId]: casesList },
        outcomeStats: { ...state.outcomeStats, [patientId]: statsList },
        assessments: {
          ...state.assessments,
          [patientId]: {
            chiefComplaint: mappedPatient.chiefComplaint,
            notes: encounterDetail.symptom?.transcription || "No resident voice dictation logged.",
            timeline: "Acute symptoms for 3-5 days.",
            positives: parsedPositives,
            negatives: parsedNegatives,
            questionsAnswered: (encounterDetail.symptom?.symptoms?.questions || []).map((q: any) => ({
              id: q.id,
              text: q.text,
              answer: q.answer || "",
              category: q.category || "General"
            }))
          }
        }
      }));
    } catch (err) {
      console.error("loadEncounterForPatient error", err);
    }
  },

  saveSoapDraft: async (encounterId, fields) => {
    try {
      const res = await apiClient.put(`/encounters/${encounterId}/soap`, fields);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save SOAP note draft.";
      throw new Error(msg);
    }
  },

  signSoapNote: async (encounterId) => {
    try {
      const res = await apiClient.post(`/encounters/${encounterId}/sign`);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to sign SOAP note.";
      throw new Error(msg);
    }
  },

  savePrescriptionDraft: async (encounterId, medications, instructions = "Take as directed", followupDate) => {
    try {
      // Map medications to format expected by StorePrescriptionRequest DTO
      const medicines = medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration
      }));

      const res = await apiClient.post("/prescriptions", {
        encounter_id: encounterId,
        medicines,
        instructions,
        followup_date: followupDate
      });
      
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save prescription draft.";
      throw new Error(msg);
    }
  },

  approvePrescriptionApi: async (prescriptionId) => {
    try {
      const res = await apiClient.post(`/prescriptions/${prescriptionId}/approve`);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to approve prescription.";
      throw new Error(msg);
    }
  },

  regenerateBrief: async (encounterId) => {
    try {
      const res = await apiClient.post(`/ai/briefs/${encounterId}/regenerate`);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to regenerate AI brief.";
      throw new Error(msg);
    }
  },

  completeConsultationApi: async (encounterId) => {
    try {
      const res = await apiClient.post(`/encounters/${encounterId}/complete`);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to complete consultation.";
      throw new Error(msg);
    }
  },
}));

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export const useSoapNoteSWR = (encounterId: number | undefined | null) => {
  const updateSoap = useSeniorDoctorStore((state) => state.updateSoap);
  const activePatientId = useSeniorDoctorStore((state) => state.activePatientId);

  return useSWR(
    encounterId ? `/encounters/${encounterId}/soap` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 0,
      onSuccess: (data) => {
        if (data && activePatientId) {
          updateSoap(activePatientId, {
            subjective: data.subjective || "",
            objective: data.objective || "",
            assessment: data.assessment || "",
            plan: data.plan || "",
            status: data.doctor_signed ? "approved" : "draft"
          });
        }
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Circuit Breaker: stop retrying on 404 (SOAP not yet generated) or after 3 attempts
        // This prevents the 'Synchronizing Intake Data' spinner from hanging indefinitely
        if (error?.response?.status === 404) return; // SOAP note doesn't exist yet — abort
        if (retryCount >= 3) return;                  // Hard limit: ~3.5s total, then resolve
        const delay = Math.min(500 * Math.pow(2, retryCount), 5000);
        setTimeout(() => revalidate({ retryCount }), delay);
      }
    }
  );
};

if (typeof window !== "undefined") {
  window.addEventListener("SOAP_GENERATED", (e: any) => {
    const encId = e.detail?.encounterId;
    if (encId) {
      mutate(`/encounters/${encId}/soap`);
    } else {
      mutate((key) => typeof key === 'string' && key.startsWith('/encounters/') && key.endsWith('/soap'));
    }
  });
}
