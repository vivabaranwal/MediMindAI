from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RiskLevel = Literal["low", "medium", "high", "critical"]

DISCLAIMER = (
    "AI-generated content for clinician review only. It is not a diagnosis, prescription or "
    "clinical decision. A licensed physician must review and approve everything before use."
)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class QA(Strict):
    question: str = Field(max_length=1000)
    answer: str = Field(max_length=2000)


class PatientFacts(Strict):
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=30)
    allergies: list[str] = Field(default_factory=list, max_length=50)
    current_medications: list[str] = Field(default_factory=list, max_length=50)
    medical_history: list[str] = Field(default_factory=list, max_length=50)


class Vitals(Strict):
    bp: str | None = None
    hr: float | None = None
    temp: float | str | None = None
    spo2: float | None = None


class Meta(Strict):
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_ms: int
    prompt_version: str


class Stamped(Strict):
    """Base for every clinical response: carries the mandatory AI disclaimer."""

    disclaimer: str = DISCLAIMER
