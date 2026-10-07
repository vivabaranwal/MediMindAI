from typing import Literal

from pydantic import Field

from app.schemas.common import QA, Meta, PatientFacts, RiskLevel, Stamped, Strict, Vitals

# ---------------------------------------------------------------- Doctor brief


class BriefRequest(Strict):
    encounter_id: int
    chief_complaint: str = Field(max_length=2000)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    vitals: Vitals | None = None
    qa: list[QA] = Field(default_factory=list, max_length=60)
    report_summaries: list[str] = Field(default_factory=list, max_length=20)


class BriefLLMOutput(Strict):
    brief: str
    risk_level: RiskLevel
    risk_rationale: str
    suggested_questions: list[str]


class BriefResponse(Stamped):
    brief: str
    risk_level: RiskLevel
    risk_rationale: str
    risk_floor_applied: bool
    red_flags: list[str]
    suggested_questions: list[str]
    meta: Meta


# ------------------------------------------------------------------------ SOAP


class SoapRequest(Strict):
    encounter_id: int
    chief_complaint: str = Field(max_length=2000)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    vitals: Vitals | None = None
    qa: list[QA] = Field(default_factory=list, max_length=60)
    report_summaries: list[str] = Field(default_factory=list, max_length=20)
    clinician_notes: str | None = Field(default=None, max_length=6000)


class SoapLLMOutput(Strict):
    subjective: str
    objective: str
    assessment: str
    plan: str


class SoapResponse(Stamped):
    subjective: str
    objective: str
    assessment: str
    plan: str
    meta: Meta


# ------------------------------------------------------ Intake (junior doctor)

QuestionCategory = Literal[
    "Symptom Details",
    "Associated Symptoms",
    "Red Flags",
    "History",
    "Medications",
    "Allergies",
    "Progression",
]


class IntakeQuestionsRequest(Strict):
    chief_complaint: str = Field(min_length=2, max_length=2000)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    vitals: Vitals | None = None
    answered: list[QA] = Field(default_factory=list, max_length=60)
    max_questions: int = Field(default=6, ge=1, le=10)


class IntakeQuestion(Strict):
    text: str
    category: QuestionCategory


class IntakeQuestionsLLMOutput(Strict):
    questions: list[IntakeQuestion]


class IntakeQuestionsResponse(Stamped):
    questions: list[IntakeQuestion]
    meta: Meta


class IntakeSummaryRequest(Strict):
    chief_complaint: str = Field(min_length=2, max_length=2000)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    vitals: Vitals | None = None
    qa: list[QA] = Field(default_factory=list, max_length=60)


class IntakeSummaryLLMOutput(Strict):
    subjective: str
    timeline: str
    symptoms: list[str]
    negatives: list[str]
    clinical_notes: str
    risk_level: RiskLevel


class IntakeSummaryResponse(Stamped):
    subjective: str
    timeline: str
    symptoms: list[str]
    negatives: list[str]
    clinical_notes: str
    risk_level: RiskLevel
    risk_floor_applied: bool
    red_flags: list[str]
    meta: Meta


# ------------------------------------------ Clinical suggestions (senior doctor)

Likelihood = Literal["high", "moderate", "low"]


class SuggestionsRequest(Strict):
    encounter_id: int
    chief_complaint: str = Field(max_length=2000)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    vitals: Vitals | None = None
    qa: list[QA] = Field(default_factory=list, max_length=60)
    report_summaries: list[str] = Field(default_factory=list, max_length=20)


class Differential(Strict):
    diagnosis: str
    likelihood: Likelihood
    rationale: str
    supporting_findings: list[str]


class Investigation(Strict):
    name: str
    rationale: str


class MedicationSuggestion(Strict):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str
    cautions: list[str]


class SuggestionsLLMOutput(Strict):
    differentials: list[Differential]
    investigations: list[Investigation]
    medications: list[MedicationSuggestion]


class SuggestionsResponse(Stamped):
    differentials: list[Differential]
    investigations: list[Investigation]
    medications: list[MedicationSuggestion]
    meta: Meta


# ------------------------------------------------- Prescription safety check


class PrescribedMedication(Strict):
    name: str = Field(min_length=1, max_length=200)
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None


class PrescriptionCheckRequest(Strict):
    medications: list[PrescribedMedication] = Field(min_length=1, max_length=30)
    patient: PatientFacts = Field(default_factory=PatientFacts)
    diagnosis: str | None = Field(default=None, max_length=500)


class ModelAlertLLM(Strict):
    severity: Literal["critical", "warning", "info"]
    medication: str
    message: str


class PrescriptionCheckLLMOutput(Strict):
    alerts: list[ModelAlertLLM]


class Alert(Strict):
    severity: Literal["critical", "warning", "info"]
    medication: str
    message: str
    source: Literal["model"] = "model"


class PrescriptionCheckResponse(Stamped):
    """Model-reviewed interaction/dosing alerts only. Allergy contraindications are Laravel's job."""

    alerts: list[Alert]
    meta: Meta
