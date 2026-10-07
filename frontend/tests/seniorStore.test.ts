import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, aiMock } = vi.hoisted(() => ({
  get: vi.fn(),
  aiMock: { getBrief: vi.fn(), generateBrief: vi.fn(), suggestions: vi.fn() },
}));

vi.mock("@/services/apiClient", () => ({ default: { get, post: vi.fn(), put: vi.fn() }, AUTH_STORAGE_KEYS: ["token", "user"] }));
vi.mock("@/services/ai.service", () => ({ AiService: aiMock }));

import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { ApiError } from "@/lib/errors";

const brief = { id: 1, encounter_id: 5, brief_text: "b", risk_level: "high", risk_rationale: "r", red_flags: [], suggested_questions: [], llm_model_used: "m", token_count: 1, generation_time_ms: 1, created_at: "" };

beforeEach(() => {
  vi.clearAllMocks();
  useSeniorDoctorStore.setState({
    patients: [{ id: 3, token: 1, code: "PT-3", name: "Asha", age: 34, gender: "Female", status: "In Review", acuity: "low acuity", encounterId: 5 }],
    ai: {}, recommendations: {}, assessments: {}, prescriptions: {}, soapNotes: {},
  });
});

describe("AI brief", () => {
  it("uses the stored brief without generating", async () => {
    aiMock.getBrief.mockResolvedValue(brief);
    await useSeniorDoctorStore.getState().loadBrief(3);
    expect(aiMock.generateBrief).not.toHaveBeenCalled();
    expect(useSeniorDoctorStore.getState().ai[3].brief).toMatchObject({ status: "ready", data: { risk_level: "high" } });
  });

  it("generates when none exists", async () => {
    aiMock.getBrief.mockResolvedValue(null);
    aiMock.generateBrief.mockResolvedValue(brief);
    await useSeniorDoctorStore.getState().loadBrief(3);
    expect(aiMock.generateBrief).toHaveBeenCalledWith(5);
    expect(useSeniorDoctorStore.getState().ai[3].brief.status).toBe("ready");
  });

  it("records failure in state (and never throws or invents a brief)", async () => {
    aiMock.getBrief.mockResolvedValue(null);
    aiMock.generateBrief.mockRejectedValue(new ApiError("No consent", "ai_consent_required", 403)); // what AiService really throws
    await expect(useSeniorDoctorStore.getState().loadBrief(3)).resolves.toBeUndefined();
    expect(useSeniorDoctorStore.getState().ai[3].brief).toMatchObject({ status: "error", error: "No consent", code: "ai_consent_required" });
    expect(useSeniorDoctorStore.getState().ai[3].brief.data).toBeUndefined();
  });

  it("regenerate skips the stored brief", async () => {
    aiMock.generateBrief.mockResolvedValue(brief);
    await useSeniorDoctorStore.getState().loadBrief(3, true);
    expect(aiMock.getBrief).not.toHaveBeenCalled();
    expect(aiMock.generateBrief).toHaveBeenCalled();
  });
});

describe("AI suggestions", () => {
  const suggestions = {
    differentials: [{ diagnosis: "Acute otitis media", likelihood: "high", rationale: "r", supporting_findings: ["ear pain"] }],
    investigations: [{ name: "Otoscopy", rationale: "look" }],
    medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "BD", duration: "5d", instructions: "with food", cautions: ["c"], alerts: [{ severity: "critical", medication: "Amoxicillin", message: "Allergy", source: "rule" }] }],
    meta: {},
  };

  it("maps results to recommendations: qualitative likelihood only, never a percentage", async () => {
    aiMock.suggestions.mockResolvedValue(suggestions);
    await useSeniorDoctorStore.getState().loadSuggestions(3);

    const recs = useSeniorDoctorStore.getState().recommendations[3];
    expect(recs.map((r) => r.type)).toEqual(["diagnosis", "investigation", "medication"]);
    expect(recs[0]).toMatchObject({ title: "Acute otitis media", likelihood: "high", evidence: "ear pain", status: "pending" });
    expect(recs[0]).not.toHaveProperty("confidence");
    expect(recs[2].evidence).toContain("Allergy"); // the allergy alert is surfaced next to the suggested drug
  });

  it("is cached for the session unless forced", async () => {
    aiMock.suggestions.mockResolvedValue(suggestions);
    await useSeniorDoctorStore.getState().loadSuggestions(3);
    await useSeniorDoctorStore.getState().loadSuggestions(3);
    expect(aiMock.suggestions).toHaveBeenCalledTimes(1);
    await useSeniorDoctorStore.getState().loadSuggestions(3, true);
    expect(aiMock.suggestions).toHaveBeenCalledTimes(2);
  });

  it("failure leaves no recommendations behind", async () => {
    aiMock.suggestions.mockRejectedValue(new Error("down"));
    await useSeniorDoctorStore.getState().loadSuggestions(3);
    expect(useSeniorDoctorStore.getState().ai[3].suggestions.status).toBe("error");
    expect(useSeniorDoctorStore.getState().recommendations[3]).toBeUndefined();
  });
});

describe("loading an encounter", () => {
  function mockApi(overrides: { symptom?: unknown; reports?: unknown[]; patient?: Record<string, unknown> } = {}) {
    get.mockImplementation((url: string) => {
      if (url === "/encounters") return Promise.resolve({ data: { data: [{ id: 5, patient_id: 3 }] } });
      if (url === "/encounters/5")
        return Promise.resolve({ data: { data: { id: 5, appointment_id: 50, status: "in_progress", appointment: { chief_complaint: "Ear pain", triage_level: "amber", slot_token: 2 }, symptom: overrides.symptom ?? null } } });
      if (url === "/patients/3")
        return Promise.resolve({ data: { data: { id: 3, patient_code: "PT-3", name: "Asha Verma", age: 34, gender: "Female", mobile: "+911", allergies: [{ allergen: "Penicillin" }], medical_history: ["Asthma"], current_medications: [], ai_consent: true, ...overrides.patient } } });
      if (url === "/reports") return Promise.resolve({ data: { data: overrides.reports ?? [] } });
      if (url === "/prescriptions") return Promise.reject(Object.assign(new Error("nf"), { isAxiosError: true, response: { status: 404, data: {} } }));
      return Promise.reject(new Error(`unexpected ${url}`));
    });
    aiMock.getBrief.mockResolvedValue(brief);
  }

  it("never invents vitals, a diagnosis or a timeline when none are recorded", async () => {
    mockApi();
    await useSeniorDoctorStore.getState().loadEncounterForPatient(3);

    const s = useSeniorDoctorStore.getState();
    const p = s.patients[0];
    expect(p.vitals).toBeUndefined(); // old code defaulted to BP 120/80, HR 80, SpO2 98
    expect(p.allergies).toEqual(["Penicillin"]);
    expect(p.acuity).toBe("high acuity");
    expect(s.prescriptions[3].selectedDiagnosis).toBe(""); // old code defaulted to "Acute Otitis Media"
    expect(s.recommendations[3]).toBeUndefined();
    expect(s.assessments[3].summary).toBeUndefined();
    expect(s.assessments[3].positives).toEqual([]);
  });

  it("uses recorded vitals and the junior's AI summary, excluding rejected questions", async () => {
    mockApi({
      symptom: {
        symptoms: {
          vitals: { bp: "130/85", hr: 88, temp: "99.5 °F", spo2: 97 },
          summary: { subjective: "s", timeline: "4 days", symptoms: ["otalgia"], negatives: ["no fever"], clinical_notes: "n", red_flags: ["mastoid tenderness or swelling"] },
          questions: [
            { id: "a", text: "Q1", answer: "yes", status: "accepted" },
            { id: "b", text: "Q2", answer: "yes", status: "rejected" },
            { id: "c", text: "Q3", answer: "", status: "accepted" },
          ],
        },
      },
    });
    await useSeniorDoctorStore.getState().loadEncounterForPatient(3);

    const s = useSeniorDoctorStore.getState();
    expect(s.patients[0].vitals).toEqual({ bp: "130/85", hr: 88, temp: "99.5 °F", spo2: 97 });
    expect(s.assessments[3].summary?.timeline).toBe("4 days");
    expect(s.assessments[3].summary?.redFlags).toEqual(["mastoid tenderness or swelling"]);
    expect(s.assessments[3].questionsAnswered.map((q) => q.id)).toEqual(["a"]);
  });

  it("maps report analysis results including warnings and failures", async () => {
    mockApi({
      reports: [
        { id: 9, file_name: "lab.pdf", report_type: "blood_test", status: "analyzed", analysis_error: null, ai_summary: "Mild anemia", uploaded_at: "2026-09-01T00:00:00Z", created_at: "2026-09-01T00:00:00Z",
          ai_findings: { document_type: "blood_test", values: [{ name: "Hb", value: "9", unit: "g/dL", reference_range: "12-16", flag: "low" }], abnormalities: ["Hb low"], observations: [], warnings: ["patient_name_mismatch"] } },
        { id: 10, file_name: "scan.png", report_type: "xray", status: "failed", analysis_error: "ocr_failed", ai_summary: null, ai_findings: null, uploaded_at: null, created_at: "2026-09-02T00:00:00Z" },
      ],
    });
    await useSeniorDoctorStore.getState().loadEncounterForPatient(3);

    const [ok, bad] = useSeniorDoctorStore.getState().patients[0].uploadedReports!;
    expect(ok).toMatchObject({ status: "analyzed", summary: "Mild anemia", warnings: ["patient_name_mismatch"], type: "pdf" });
    expect(ok.values[0].flag).toBe("low");
    expect(bad).toMatchObject({ status: "failed", analysisError: "ocr_failed", summary: null, values: [], type: "image" });
  });

  it("throws when the patient has no active encounter, instead of inventing one", async () => {
    get.mockImplementation((url: string) => (url === "/encounters" ? Promise.resolve({ data: { data: [] } }) : Promise.reject(new Error("unexpected"))));
    await expect(useSeniorDoctorStore.getState().loadEncounterForPatient(3)).rejects.toThrow(/no active encounter/i);
  });
});
