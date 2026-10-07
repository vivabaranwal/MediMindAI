from typing import Protocol

from langchain_openai import OpenAIEmbeddings

from app.core.config import Settings
from app.core.errors import RetrievalError
from app.core.logging import get_logger

log = get_logger("embeddings")


class Embedder(Protocol):
    async def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    async def embed_query(self, text: str) -> list[float]: ...


class OpenAIEmbedder:
    """No fallback vectors: if embedding fails the operation fails, rather than
    silently indexing meaningless vectors that make retrieval look like it works."""

    def __init__(self, settings: Settings):
        self._emb = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
            dimensions=settings.EMBEDDING_DIM,
            max_retries=settings.LLM_MAX_RETRIES,
            request_timeout=settings.LLM_TIMEOUT_SECONDS,
        )

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        try:
            return await self._emb.aembed_documents(texts)
        except Exception as exc:
            log.error("embed_failed", extra={"error_type": type(exc).__name__, "count": len(texts)})
            raise RetrievalError("Embedding request failed.") from exc

    async def embed_query(self, text: str) -> list[float]:
        try:
            return await self._emb.aembed_query(text)
        except Exception as exc:
            log.error("embed_failed", extra={"error_type": type(exc).__name__, "count": 1})
            raise RetrievalError("Embedding request failed.") from exc
