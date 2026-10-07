"""Single-step clinical generation pipelines: brief, SOAP, intake, suggestions, Rx check.

Each one: build prompt -> structured LLM call -> apply deterministic safety rules.
Rules are applied *after* the model so the model cannot argue its way past them.
"""

from app.llm.gateway import StructuredLLM
from app.prompts import tasks
from app.prompts.common import PROMPT_VERSION, render_case, render_patient
from app.schemas.clinical import (
    Alert,
    BriefLLMOutput,
    BriefRequest,
    BriefResponse,
    IntakeQuestion,
    IntakeQuestionsLLMOutput,
    IntakeQuestionsRequest,
    IntakeQuestionsResponse,
    IntakeSummaryLLMOutput,
    IntakeSummaryRequest,
    IntakeSummaryResponse,
    PrescriptionCheckLLMOutput,
    PrescriptionCheckRequest,
    PrescriptionCheckResponse,
    SoapLLMOutput,
    SoapRequest,
    SoapResponse,
    SuggestionsLLMOutput,
    SuggestionsRequest,
    SuggestionsResponse,
)
from app.validation.clinical_rules import detect_red_flags, max_risk

_SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


def _norm(text: str) -> str:
    return " ".join(text.lower().split()).rstrip("?. ")


class ClinicalPipelines:
    def __init__(self, llm: StructuredLLM):
        self._llm = llm

    async def brief(self, req: BriefRequest) -> BriefResponse:
        flags = detect_red_flags(req.chief_complaint, req.qa)
        user = render_case(
            chief_complaint=req.chief_complaint, patient=req.patient, vitals=req.vitals,
            qa=req.qa, report_summaries=req.report_summaries,
        )
        out, meta = await self._llm.structured(
            BriefLLMOutput, task="brief", prompt_version=PROMPT_VERSION, system=tasks.BRIEF, user=user
        )
        risk = max_risk(out.risk_level, flags.floor)
        answered = {_norm(i.question) for i in req.qa}
        return BriefResponse(
            brief=out.brief,
            risk_level=risk,
            risk_rationale=out.risk_rationale,
            risk_floor_applied=risk != out.risk_level,
            red_flags=flags.labels,
            suggested_questions=[q for q in out.suggested_questions if _norm(q) not in answered][:5],
            meta=meta,
        )

    async def soap(self, req: SoapRequest) -> SoapResponse:
        extra = f"Clinician notes (priority source):\n{req.clinician_notes}" if req.clinician_notes else None
        user = render_case(
            chief_complaint=req.chief_complaint, patient=req.patient, vitals=req.vitals,
            qa=req.qa, report_summaries=req.report_summaries, extra=extra,
        )
        out, meta = await self._llm.structured(
            SoapLLMOutput, task="soap", prompt_version=PROMPT_VERSION, system=tasks.SOAP, user=user
        )
        return SoapResponse(
            subjective=out.subjective, objective=out.objective,
            assessment=out.assessment, plan=out.plan, meta=meta,
        )

    async def intake_questions(self, req: IntakeQuestionsRequest) -> IntakeQuestionsResponse:
        user = render_case(
            chief_complaint=req.chief_complaint, patient=req.patient, vitals=req.vitals, qa=req.answered,
            extra=f"Return at most {req.max_questions} questions.",
        )
        out, meta = await self._llm.structured(
            IntakeQuestionsLLMOutput, task="intake_questions", prompt_version=PROMPT_VERSION,
            system=tasks.INTAKE_QUESTIONS, user=user,
        )
        seen = {_norm(i.question) for i in req.answered}
        questions: list[IntakeQuestion] = []
        for q in out.questions:
            key = _norm(q.text)
            if key and key not in seen:
                seen.add(key)
                questions.append(q)
        return IntakeQuestionsResponse(questions=questions[: req.max_questions], meta=meta)

    async def intake_summary(self, req: IntakeSummaryRequest) -> IntakeSummaryResponse:
        flags = detect_red_flags(req.chief_complaint, req.qa)
        user = render_case(
            chief_complaint=req.chief_complaint, patient=req.patient, vitals=req.vitals, qa=req.qa
        )
        out, meta = await self._llm.structured(
            IntakeSummaryLLMOutput, task="intake_summary", prompt_version=PROMPT_VERSION,
            system=tasks.INTAKE_SUMMARY, user=user,
        )
        risk = max_risk(out.risk_level, flags.floor)
        return IntakeSummaryResponse(
            subjective=out.subjective, timeline=out.timeline, symptoms=out.symptoms,
            negatives=out.negatives, clinical_notes=out.clinical_notes, risk_level=risk,
            risk_floor_applied=risk != out.risk_level, red_flags=flags.labels, meta=meta,
        )

    async def suggestions(self, req: SuggestionsRequest) -> SuggestionsResponse:
        user = render_case(
            chief_complaint=req.chief_complaint, patient=req.patient, vitals=req.vitals,
            qa=req.qa, report_summaries=req.report_summaries,
        )
        out, meta = await self._llm.structured(
            SuggestionsLLMOutput, task="suggestions", prompt_version=PROMPT_VERSION,
            system=tasks.SUGGESTIONS, user=user,
        )
        return SuggestionsResponse(
            differentials=out.differentials, investigations=out.investigations, medications=out.medications, meta=meta
        )

    async def prescription_check(self, req: PrescriptionCheckRequest) -> PrescriptionCheckResponse:
        drugs = "\n".join(
            f"- {m.name} | dose: {m.dosage or 'n/s'} | frequency: {m.frequency or 'n/s'} | duration: {m.duration or 'n/s'}"
            for m in req.medications
        )
        user = (
            "<case>\n"
            f"Patient:\n{render_patient(req.patient)}\n\n"
            f"Working diagnosis: {req.diagnosis or 'Not documented'}\n\n"
            f"Draft prescription:\n{drugs}\n"
            "</case>"
        )
        out, meta = await self._llm.structured(
            PrescriptionCheckLLMOutput, task="prescription_check", prompt_version=PROMPT_VERSION,
            system=tasks.PRESCRIPTION_CHECK, user=user,
        )
        alerts = sorted(
            (Alert(severity=a.severity, medication=a.medication, message=a.message) for a in out.alerts),
            key=lambda a: _SEVERITY_ORDER[a.severity],
        )
        return PrescriptionCheckResponse(alerts=alerts, meta=meta)
