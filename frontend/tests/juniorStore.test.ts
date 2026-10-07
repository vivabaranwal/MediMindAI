import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, get, aiMock } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  aiMock: { intakeQuestions: vi.fn(), intakeSummary: vi.fn() },
}));

vi.mock("@/services/apiClient", () => ({ default: { post, get }, AUTH_STORAGE_KEYS: ["token", "user"] }));
vi.mock("@/services/ai.service", () => ({ AiService: aiMock, DirectoryService: { doctors: vi.fn() } }));

import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";

const patient = {
  id: 7, token: 1, code: "PT-7", name: "Asha Verma", age: 34, gender: "Female",
  status: "Waiting" as const, acuity: "low acuity" as const, appointmentId: 70,
};

beforeEach(() => {
  vi.clearAllMocks();
  useJuniorDoctorStore.setState({ patients: [{ ...patient }], assessments: {}, doctors: [{ id: 2, name: "Dr B", specialization: "ENT" }], casesSentToSenior: [] });
});

describe("junior intake flow", () => {
  it("starts an assessment from AI questions and sends only vitals that were entered", async () => {
    aiMock.intakeQuestions.mockResolvedValue({ questions: [{ text: "Any fever?", category: "Red Flags" }] });

    await useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain", { bp: "", hr: 80, temp: undefined });

    expect(aiMock.intakeQuestions).toHaveBeenCalledWith(70, { chiefComplaint: "Ear pain", vitals: { hr: 80 } });
    const a = useJuniorDoctorStore.getState().assessments[7];
    expect(a.questions).toHaveLength(1);
    expect(a.questions[0]).toMatchObject({ text: "Any fever?", status: "suggested" });
    expect(useJuniorDoctorStore.getState().patients[0].status).toBe("In Assessment");
  });

  it("refuses to open a session when the AI returns nothing (no empty checklist)", async () => {
    aiMock.intakeQuestions.mockResolvedValue({ questions: [] });
    await expect(useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain")).rejects.toThrow(/no questions/i);
    expect(useJuniorDoctorStore.getState().assessments[7]).toBeUndefined();
  });

  it("propagates AI failures instead of fabricating questions", async () => {
    aiMock.intakeQuestions.mockRejectedValue(new Error("AI down"));
    await expect(useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain")).rejects.toThrow("AI down");
    expect(useJuniorDoctorStore.getState().assessments[7]).toBeUndefined();
  });

  it("follow-up questions exclude duplicates of anything already asked", async () => {
    aiMock.intakeQuestions.mockResolvedValueOnce({ questions: [{ text: "Any fever?", category: "Red Flags" }] });
    await useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain");
    aiMock.intakeQuestions.mockResolvedValueOnce({
      questions: [{ text: "any fever? ", category: "Red Flags" }, { text: "Any discharge?", category: "Symptom Details" }],
    });

    const added = await useJuniorDoctorStore.getState().requestMoreQuestions(7);

    expect(added).toBe(1);
    expect(useJuniorDoctorStore.getState().assessments[7].questions.map((q) => q.text)).toEqual(["Any fever?", "Any discharge?"]);
  });

  it("compiles the summary only from accepted, answered questions and adopts the AI risk (incl. safety floor)", async () => {
    aiMock.intakeQuestions.mockResolvedValue({ questions: [{ text: "Q1", category: "History" }, { text: "Q2", category: "History" }, { text: "Q3", category: "History" }] });
    await useJuniorDoctorStore.getState().beginAssessment(7, "Throat pain");
    const [q1, q2, q3] = useJuniorDoctorStore.getState().assessments[7].questions;
    const s = useJuniorDoctorStore.getState();
    s.updateQuestionStatus(7, q1.id, "accepted"); s.answerQuestion(7, q1.id, "Yes, since last night");
    s.updateQuestionStatus(7, q2.id, "rejected"); s.answerQuestion(7, q2.id, "should not be sent");
    s.updateQuestionStatus(7, q3.id, "accepted"); // accepted but unanswered

    aiMock.intakeSummary.mockResolvedValue({
      subjective: "s", timeline: "t", symptoms: ["x"], negatives: [], clinical_notes: "n",
      risk_level: "critical", risk_floor_applied: true, red_flags: ["stridor"], meta: {},
    });
    await useJuniorDoctorStore.getState().compileSummary(7);

    expect(aiMock.intakeSummary.mock.calls[0][1].qa).toEqual([{ question: "Q1", answer: "Yes, since last night" }]);
    const state = useJuniorDoctorStore.getState();
    expect(state.assessments[7].summary).toMatchObject({ riskAssessment: "emergent acuity", redFlags: ["stridor"], riskFloorApplied: true });
    expect(state.patients[0].acuity).toBe("emergent acuity");
  });

  it("hands off with the chosen doctor and the real summary, and sends no invented values or SOAP note", async () => {
    aiMock.intakeQuestions.mockResolvedValue({ questions: [{ text: "Q1", category: "History" }] });
    await useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain");
    useJuniorDoctorStore.getState().updateSummary(7, {
      subjective: "S", timeline: "T", symptoms: ["a"], negatives: ["b"], clinicalNotes: "N",
      riskAssessment: "high acuity", redFlags: ["mastoid tenderness or swelling"], riskFloorApplied: false,
    });
    post.mockResolvedValue({ data: { success: true } });

    await useJuniorDoctorStore.getState().sendToSenior(7, 2);

    const [url, payload] = post.mock.calls[0];
    expect(url).toBe("/appointments/70/assessment");
    expect(payload).toMatchObject({
      doctor_id: 2, triage_level: "amber", chief_complaint: "Ear pain",
      summary: { risk_level: "high", red_flags: ["mastoid tenderness or swelling"], clinical_notes: "N" },
    });
    expect(payload.vitals).toBeUndefined(); // none entered, none invented (no 120/80 or 98.6 default)
    expect(payload).not.toHaveProperty("soap_note");
    expect(useJuniorDoctorStore.getState().patients[0]).toMatchObject({ status: "Completed", assignedDoctor: "Dr B" });
  });

  it("does not mark a case as sent when the handoff fails", async () => {
    aiMock.intakeQuestions.mockResolvedValue({ questions: [{ text: "Q1", category: "History" }] });
    await useJuniorDoctorStore.getState().beginAssessment(7, "Ear pain");
    useJuniorDoctorStore.getState().updateSummary(7, {
      subjective: "S", timeline: "T", symptoms: [], negatives: [], clinicalNotes: "N", riskAssessment: "low acuity", redFlags: [], riskFloorApplied: false,
    });
    post.mockRejectedValue(new Error("network"));

    await expect(useJuniorDoctorStore.getState().sendToSenior(7, 2)).rejects.toThrow();
    expect(useJuniorDoctorStore.getState().patients[0].status).toBe("In Assessment");
    expect(useJuniorDoctorStore.getState().casesSentToSenior).toHaveLength(0);
  });
});
