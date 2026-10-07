import pytest
from openai.lib._pydantic import to_strict_json_schema
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.clinical import (
    BriefLLMOutput,
    IntakeQuestionsLLMOutput,
    IntakeSummaryLLMOutput,
    PrescriptionCheckLLMOutput,
    SoapLLMOutput,
    SuggestionsLLMOutput,
)
from app.schemas.documents import ChatLLMOutput, ReportFindingsLLMOutput

GOOD = {"INTERNAL_API_SECRET": "x" * 32, "OPENAI_API_KEY": "sk-" + "a" * 30}


def settings(**over):
    return Settings(_env_file=None, **{**GOOD, **over})


def test_valid_config_loads():
    assert settings().LLM_MODEL


@pytest.mark.parametrize("secret", ["super-secret-token", "short", "changeme", "SECRET"])
def test_weak_or_short_internal_secret_is_refused(secret):
    with pytest.raises(ValidationError):
        settings(INTERNAL_API_SECRET=secret)


def test_placeholder_or_missing_openai_key_is_refused(monkeypatch):
    with pytest.raises(ValidationError):
        settings(OPENAI_API_KEY="mock-key-for-testing-only-1234")
    monkeypatch.delenv("OPENAI_API_KEY")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, INTERNAL_API_SECRET="x" * 32)


@pytest.mark.parametrize("schema", [
    BriefLLMOutput, SoapLLMOutput, IntakeQuestionsLLMOutput, IntakeSummaryLLMOutput,
    SuggestionsLLMOutput, PrescriptionCheckLLMOutput, ReportFindingsLLMOutput, ChatLLMOutput,
])
def test_llm_output_schemas_are_valid_for_openai_strict_mode(schema):
    """Strict structured output rejects optional fields with defaults, open dicts, etc.
    This catches such a schema offline instead of at the first live request."""
    to_strict_json_schema(schema)
