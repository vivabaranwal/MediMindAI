from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Values that have appeared in this repo's history or docs. Never acceptable.
_WEAK_SECRETS = {"super-secret-token", "secret", "changeme", "password", "mock-key"}


class Settings(BaseSettings):
    """Runtime configuration. Required values have no defaults on purpose:
    the service refuses to start rather than run with a placeholder."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Auth between Laravel and this service
    INTERNAL_API_SECRET: str = Field(min_length=24)

    # LLM / embeddings (OpenAI)
    OPENAI_API_KEY: str = Field(min_length=20)
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_MAX_RETRIES: int = 2
    LLM_TEMPERATURE: float = 0.1
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536

    # Vector store. Use ":memory:" only in tests.
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "medimind_report_chunks"

    # Document processing
    OCR_LANGS: str = "eng+hin"
    OCR_RENDER_SCALE: float = 2.0
    MAX_UPLOAD_BYTES: int = 20 * 1024 * 1024
    MAX_PDF_PAGES: int = 40
    MIN_TEXT_CHARS_PER_PAGE: int = 30
    MAX_IMAGE_PIXELS: int = 60_000_000

    # Chunking / retrieval
    CHUNK_CHARS: int = 1500
    CHUNK_OVERLAP_CHARS: int = 150
    RETRIEVAL_TOP_K: int = 6
    MAX_CHAT_HISTORY_TURNS: int = 10

    LOG_LEVEL: str = "INFO"

    @field_validator("INTERNAL_API_SECRET", "OPENAI_API_KEY")
    @classmethod
    def _reject_placeholders(cls, v: str) -> str:
        if v.strip().lower() in _WEAK_SECRETS or v.lower().startswith("mock"):
            raise ValueError("placeholder/weak secret is not allowed")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
