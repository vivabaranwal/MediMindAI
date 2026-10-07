from typing import Literal

from pydantic import Field

from app.schemas.common import Meta, Stamped, Strict

DocumentType = Literal[
    "blood_test", "audiogram", "imaging", "prescription", "discharge_summary", "other"
]
ValueFlag = Literal["normal", "low", "high", "critical", "unknown"]


class LabValue(Strict):
    name: str
    value: str
    unit: str | None
    reference_range: str | None
    flag: ValueFlag


class ReportFindingsLLMOutput(Strict):
    document_type: DocumentType
    summary: str
    patient_name: str | None
    report_date: str | None
    values: list[LabValue]
    abnormalities: list[str]
    observations: list[str]


class ExtractionInfo(Strict):
    pages: int
    ocr_pages: int
    characters: int
    low_confidence_pages: list[int]


class ReportIngestResponse(Stamped):
    report_id: int
    extraction: ExtractionInfo
    document_type: DocumentType
    summary: str
    patient_name_detected: str | None
    report_date: str | None
    values: list[LabValue]
    abnormalities: list[str]
    observations: list[str]
    chunks_indexed: int
    meta: Meta


class ReportDeleteResponse(Strict):
    report_id: int
    deleted: bool


# ------------------------------------------------------------------------ Chat


class ChatTurn(Strict):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(Strict):
    patient_id: int
    encounter_id: int | None = None
    query: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)
    # Structured chart facts assembled by Laravel for this encounter. Treated as the
    # authoritative record; report excerpts are retrieved separately.
    chart_context: str = Field(default="", max_length=20000)


class ChatLLMOutput(Strict):
    answer: str
    used_source_ids: list[str]
    insufficient_information: bool


class Citation(Strict):
    source_id: str
    label: str
    snippet: str


class ChatResponse(Stamped):
    answer: str
    citations: list[Citation]
    insufficient_information: bool
    meta: Meta
