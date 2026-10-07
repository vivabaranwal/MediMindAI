import json
import logging

import pytest

from app.core.errors import LLMError
from app.schemas.clinical import (
    BriefLLMOutput,
    IntakeQuestion,
    IntakeQuestionsLLMOutput,
    IntakeSummaryLLMOutput,
    ModelAlertLLM,
    PrescriptionCheckLLMOutput,
    SuggestionsLLMOutput,
    MedicationSuggestion,
)
from app.schemas.documents import ChatLLMOutput, LabValue, ReportFindingsLLMOutput
from tests.conftest import HEADERS, make_png, make_text_pdf

BRIEF = {
    "encounter_id": 7,
    "chief_complaint": "Sore throat for two days",
    "patient": {"age": 34, "gender": "female", "allergies": ["Penicillin"]},
    "vitals": {"bp": "120/80", "hr": 80, "temp": 99.1, "spo2": 98},
    "qa": [{"question": "Are you experiencing any shortness of breath?", "answer": "No"}],
}


# ----------------------------------------------------------------------- auth


@pytest.mark.parametrize("headers", [{}, {"X-Internal-Secret": "wrong"}, {"X-Internal-Secret": "super-secret-token"}])
def test_every_internal_route_requires_the_secret(client, headers):
    for method, path in [("post", "/internal/v1/briefs"), ("post", "/internal/v1/chat"),
                         ("post", "/internal/v1/reports/ingest"), ("delete", "/internal/v1/reports/1")]:
        r = getattr(client, method)(path, headers=headers)
        assert r.status_code == 401, path
        assert r.json()["error"]["code"] == "unauthorized"


def test_probes_are_open_and_content_free(client):
    assert client.get("/health").json() == {"status": "ok"}
    ready = client.get("/ready").json()
    assert set(ready) == {"status", "index", "ocr"}


# ------------------------------------------------------------ brief + safety


def test_brief_cannot_lower_risk_below_red_flag_floor(client, llm):
    llm.will_return(BriefLLMOutput, BriefLLMOutput(
        brief="Mild sore throat.", risk_level="low", risk_rationale="No concerning findings.", suggested_questions=[]))
    body = {**BRIEF, "chief_complaint": "Sore throat and neck swelling for 3 days"}

    r = client.post("/internal/v1/briefs", json=body, headers=HEADERS)

    assert r.status_code == 200
    data = r.json()
    assert data["risk_level"] == "high"
    assert data["risk_floor_applied"] is True
    assert data["red_flags"] == ["neck swelling"]
    assert "disclaimer" in data and data["meta"]["model"] == "fake-model"


def test_brief_denied_red_flag_is_not_escalated(client, llm):
    llm.will_return(BriefLLMOutput, BriefLLMOutput(
        brief="Mild sore throat.", risk_level="low", risk_rationale="r", suggested_questions=[
            "Are you experiencing any shortness of breath?", "Any ear pain?"]))
    r = client.post("/internal/v1/briefs", json=BRIEF, headers=HEADERS)
    data = r.json()
    assert data["risk_level"] == "low" and data["red_flags"] == []
    assert data["suggested_questions"] == ["Any ear pain?"]  # already-answered question removed


def test_missing_info_is_labelled_not_invented(client, llm):
    llm.will_return(BriefLLMOutput, BriefLLMOutput(brief="b", risk_level="low", risk_rationale="r", suggested_questions=[]))
    client.post("/internal/v1/briefs", json={"encounter_id": 1, "chief_complaint": "Routine check"}, headers=HEADERS)
    user = llm.calls[-1]["user"]
    assert "Vitals: Not documented" in user and "Allergies: None documented" in user
    assert "Never invent" in llm.calls[-1]["system"]


def test_intake_questions_exclude_answered_and_duplicates(client, llm):
    q = lambda t: IntakeQuestion(text=t, category="Red Flags")  # noqa: E731
    llm.will_return(IntakeQuestionsLLMOutput, IntakeQuestionsLLMOutput(questions=[
        q("Is there swelling behind the ear?"), q("Is there swelling behind the ear??"), q("Any fever?"), q("Any discharge?")]))
    r = client.post("/internal/v1/intake/questions", headers=HEADERS, json={
        "chief_complaint": "Ear pain", "max_questions": 2,
        "answered": [{"question": "Any fever?", "answer": "no"}]})
    texts = [x["text"] for x in r.json()["questions"]]
    assert texts == ["Is there swelling behind the ear?", "Any discharge?"]


def test_intake_summary_applies_floor_from_affirmed_red_flag(client, llm):
    llm.will_return(IntakeSummaryLLMOutput, IntakeSummaryLLMOutput(
        subjective="s", timeline="t", symptoms=[], negatives=[], clinical_notes="n", risk_level="low"))
    r = client.post("/internal/v1/intake/summary", headers=HEADERS, json={
        "chief_complaint": "Throat pain",
        "qa": [{"question": "Any shortness of breath?", "answer": "Yes, mild"}]})
    assert r.json()["risk_level"] == "critical" and r.json()["risk_floor_applied"] is True


def test_suggestions_pass_through_and_carry_no_server_side_allergy_logic(client, llm):
    med = MedicationSuggestion(name="Amoxicillin 500mg", dosage="d", frequency="f", duration="x", instructions="i", cautions=[])
    llm.will_return(SuggestionsLLMOutput, SuggestionsLLMOutput(differentials=[], investigations=[], medications=[med]))
    r = client.post("/internal/v1/suggestions", headers=HEADERS,
                    json={k: BRIEF[k] for k in ("encounter_id", "chief_complaint", "patient")})
    meds = r.json()["medications"]
    assert meds[0]["name"] == "Amoxicillin 500mg"
    assert "alerts" not in meds[0]  # allergy contraindications are enforced in Laravel
    assert "Penicillin" in llm.calls[-1]["user"]  # but the model is told about the allergy


def test_prescription_check_returns_model_alerts_sorted_and_labelled(client, llm):
    llm.will_return(PrescriptionCheckLLMOutput, PrescriptionCheckLLMOutput(alerts=[
        ModelAlertLLM(severity="info", medication="Paracetamol", message="Max 4 g/day."),
        ModelAlertLLM(severity="critical", medication="Warfarin", message="Interacts with NSAIDs."),
    ]))
    r = client.post("/internal/v1/prescriptions/check", headers=HEADERS, json={
        "medications": [{"name": "Paracetamol"}, {"name": "Warfarin"}], "patient": {"allergies": ["Penicillin"]}})
    alerts = r.json()["alerts"]
    assert [a["severity"] for a in alerts] == ["critical", "info"]
    assert {a["source"] for a in alerts} == {"model"}  # the model can never claim to be a rule


# -------------------------------------------------------------------- errors


def test_llm_failure_is_an_error_status_never_a_200_with_error_text(client, llm):
    llm.error = LLMError()
    r = client.post("/internal/v1/briefs", json=BRIEF, headers=HEADERS)
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "llm_error"
    assert "brief" not in r.json()


def test_unexpected_exception_is_500_with_envelope_and_no_leak(client, llm):
    llm.error = RuntimeError("secret internals: sk-live-abc")
    r = client.post("/internal/v1/briefs", json=BRIEF, headers=HEADERS)
    assert r.status_code == 500
    assert "sk-live" not in r.text
    assert r.json()["error"]["code"] == "internal_error"


def test_validation_error_does_not_echo_submitted_values(client):
    r = client.post("/internal/v1/briefs", headers=HEADERS,
                    json={"encounter_id": "NOT-A-NUMBER", "chief_complaint": "patient John Doe has cancer"})
    assert r.status_code == 422
    assert "John Doe" not in r.text and "NOT-A-NUMBER" not in r.text
    assert r.json()["error"]["details"][0]["field"] == "encounter_id"


def test_request_id_is_propagated(client, llm):
    llm.will_return(BriefLLMOutput, BriefLLMOutput(brief="b", risk_level="low", risk_rationale="r", suggested_questions=[]))
    r = client.post("/internal/v1/briefs", json=BRIEF, headers={**HEADERS, "X-Request-ID": "abc-123"})
    assert r.headers["X-Request-ID"] == "abc-123"


# ----------------------------------------------- report ingest -> chat journey

REPORT_TEXT = (
    "CITY DIAGNOSTICS LAB. Patient: Asha Verma. Date: 12 Sep 2026.\n\n"
    "Complete blood count. Hemoglobin 9.1 g/dL reference 12.0-16.0. WBC 7.2 reference 4.0-11.0.\n\n"
    "Impression: mild anemia."
)


def findings(**over):
    base = dict(
        document_type="blood_test", summary="CBC shows mild anemia.", patient_name="Asha Verma",
        report_date="12 Sep 2026",
        values=[LabValue(name="Hemoglobin", value="9.1", unit="g/dL", reference_range="12.0-16.0", flag="normal"),  # model wrong
                LabValue(name="WBC", value="7.2", unit=None, reference_range="4.0-11.0", flag="normal")],
        abnormalities=[], observations=["Impression: mild anemia."])
    base.update(over)
    return ReportFindingsLLMOutput(**base)


def ingest(client, report_id=1, patient_id=5, data=None, **form):
    return client.post("/internal/v1/reports/ingest", headers=HEADERS,
                       files={"file": ("r.pdf", make_text_pdf(REPORT_TEXT) if data is None else data, "application/pdf")},
                       data={"report_id": report_id, "patient_id": patient_id, **form})


def test_ingest_extracts_corrects_flags_and_indexes(client, llm, services):
    llm.will_return(ReportFindingsLLMOutput, findings())
    r = ingest(client)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["extraction"] == {"pages": 1, "ocr_pages": 0, "characters": d["extraction"]["characters"], "low_confidence_pages": []}
    hb = next(v for v in d["values"] if v["name"] == "Hemoglobin")
    assert hb["flag"] == "low"  # arithmetic overrode the model's "normal"
    assert any("Hemoglobin" in a and "low" in a for a in d["abnormalities"])  # surfaced though the model omitted it
    assert d["patient_name_detected"] == "Asha Verma"
    assert d["chunks_indexed"] >= 1
    assert "Hemoglobin 9.1" in llm.calls[-1]["user"] and llm.calls[-1]["user"].startswith("<document>")


def test_ingest_scanned_pdf_and_image_use_ocr(client, llm, ocr):
    llm.will_return(ReportFindingsLLMOutput, findings())
    from tests.conftest import make_scanned_pdf
    assert ingest(client, 1, data=make_scanned_pdf()).json()["extraction"]["ocr_pages"] == 1
    r = client.post("/internal/v1/reports/ingest", headers=HEADERS, data={"report_id": 2, "patient_id": 5},
                    files={"file": ("scan.png", make_png(), "image/png")})
    assert r.status_code == 200 and ocr.calls == 2


def test_ingest_rejects_bad_files_with_typed_errors(client, llm):
    llm.will_return(ReportFindingsLLMOutput, findings())
    r = ingest(client, data=b"MZ not a pdf at all")
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_file_type"
    r = ingest(client, data=b"")
    assert r.status_code == 400
    assert llm.calls == []  # nothing reached the model


def test_chat_answers_from_indexed_report_with_citation(client, llm):
    llm.will_return(ReportFindingsLLMOutput, findings())
    ingest(client, report_id=11, patient_id=5)

    def answer(user):
        # Cite whichever report chunk was actually offered to the model.
        sid = next(line[1:line.index("]")] for line in user.splitlines() if line.startswith("[report:"))
        return ChatLLMOutput(answer="Hemoglobin is 9.1 g/dL (low).", used_source_ids=[sid], insufficient_information=False)

    llm.will_return(ChatLLMOutput, answer)
    r = client.post("/internal/v1/chat", headers=HEADERS, json={"patient_id": 5, "query": "What is the hemoglobin?"})
    d = r.json()
    assert r.status_code == 200
    assert d["insufficient_information"] is False
    assert d["citations"][0]["source_id"].startswith("report:11:p1")
    assert "Report #11, page 1" == d["citations"][0]["label"]


def test_retrieval_never_crosses_patients(client, llm):
    llm.will_return(ReportFindingsLLMOutput, findings())
    ingest(client, report_id=11, patient_id=5)
    llm.will_return(ChatLLMOutput, ChatLLMOutput(answer="x", used_source_ids=[], insufficient_information=True))

    # Different patient asks the identical question: no chunks, no chart -> the model must not even be called.
    before = len(llm.calls)
    r = client.post("/internal/v1/chat", headers=HEADERS, json={"patient_id": 99, "query": "What is the hemoglobin?"})
    assert r.json()["insufficient_information"] is True and r.json()["citations"] == []
    assert len(llm.calls) == before


def test_ungrounded_answer_is_replaced(client, llm):
    llm.will_return(ChatLLMOutput, ChatLLMOutput(answer="The patient has diabetes.", used_source_ids=["made-up-id"], insufficient_information=False))
    r = client.post("/internal/v1/chat", headers=HEADERS, json={
        "patient_id": 5, "query": "Does the patient have diabetes?", "chart_context": "Age: 34. Allergies: Penicillin."})
    d = r.json()
    assert "diabetes" not in d["answer"].lower().replace("does the patient have diabetes", "")
    assert d["insufficient_information"] is True and d["citations"] == []


def test_chart_context_is_a_citable_source(client, llm):
    llm.will_return(ChatLLMOutput, ChatLLMOutput(answer="Allergic to penicillin.", used_source_ids=["chart"], insufficient_information=False))
    r = client.post("/internal/v1/chat", headers=HEADERS, json={
        "patient_id": 5, "query": "Any allergies?", "chart_context": "Allergies: Penicillin"})
    assert r.json()["citations"][0]["source_id"] == "chart"


def test_reingesting_a_report_replaces_its_chunks(client, llm, services):
    llm.will_return(ReportFindingsLLMOutput, findings())
    first = ingest(client, report_id=3, patient_id=5).json()["chunks_indexed"]
    second = ingest(client, report_id=3, patient_id=5).json()["chunks_indexed"]
    assert first == second
    count = services.store._client.count(services.store._collection).count
    assert count == first


def test_delete_report_removes_it_from_retrieval(client, llm):
    llm.will_return(ReportFindingsLLMOutput, findings())
    ingest(client, report_id=4, patient_id=5)
    assert client.delete("/internal/v1/reports/4", headers=HEADERS).json() == {"report_id": 4, "deleted": True}
    llm.will_return(ChatLLMOutput, ChatLLMOutput(answer="x", used_source_ids=[], insufficient_information=True))
    r = client.post("/internal/v1/chat", headers=HEADERS, json={"patient_id": 5, "query": "hemoglobin"})
    assert r.json()["citations"] == []


# --------------------------------------------------------------- observability


def test_logs_contain_no_clinical_text(client, llm, caplog):
    caplog.set_level(logging.INFO)
    llm.will_return(BriefLLMOutput, BriefLLMOutput(brief="b", risk_level="low", risk_rationale="r", suggested_questions=[]))
    client.post("/internal/v1/briefs", headers=HEADERS,
                json={**BRIEF, "chief_complaint": "ZZ_UNIQUE_COMPLAINT_TEXT", "patient": {"allergies": ["ZZ_UNIQUE_ALLERGY"]}})
    llm.will_return(ReportFindingsLLMOutput, findings())
    ingest(client, data=make_text_pdf("ZZ_UNIQUE_REPORT_BODY " * 5))
    logged = " ".join(json.dumps(r.__dict__, default=str) for r in caplog.records)
    for secret in ("ZZ_UNIQUE_COMPLAINT_TEXT", "ZZ_UNIQUE_ALLERGY", "ZZ_UNIQUE_REPORT_BODY"):
        assert secret not in logged
    assert any(r.getMessage() == "http_request" for r in caplog.records)  # logging is on, just content-free
