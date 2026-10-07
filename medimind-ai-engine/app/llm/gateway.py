"""The single place that talks to the chat model.

Pipelines depend on the `StructuredLLM` protocol, not on OpenAI, so the provider can
change (or be replaced by a test double) without touching any pipeline.
"""

import time
from typing import Protocol, TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.core.config import Settings
from app.core.errors import LLMError, LLMOutputInvalid
from app.core.logging import get_logger
from app.schemas.common import Meta

T = TypeVar("T", bound=BaseModel)
log = get_logger("llm")


class StructuredLLM(Protocol):
    async def structured(
        self, schema: type[T], *, task: str, prompt_version: str, system: str, user: str
    ) -> tuple[T, Meta]: ...


class OpenAIGateway:
    def __init__(self, settings: Settings):
        self._model = settings.LLM_MODEL
        self._chat = ChatOpenAI(
            model=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            timeout=settings.LLM_TIMEOUT_SECONDS,
            max_retries=settings.LLM_MAX_RETRIES,
            temperature=settings.LLM_TEMPERATURE,
        )

    async def structured(
        self, schema: type[T], *, task: str, prompt_version: str, system: str, user: str
    ) -> tuple[T, Meta]:
        runnable = self._chat.with_structured_output(
            schema, method="json_schema", strict=True, include_raw=True
        )
        started = time.monotonic()
        try:
            result = await runnable.ainvoke([SystemMessage(content=system), HumanMessage(content=user)])
        except Exception as exc:  # provider/network/timeout; message may echo prompt, so log type only
            log.error("llm_call_failed", extra={"task": task, "error_type": type(exc).__name__})
            raise LLMError() from exc

        latency_ms = int((time.monotonic() - started) * 1000)
        parsed = result.get("parsed")
        if parsed is None:
            log.error("llm_output_invalid", extra={"task": task, "latency_ms": latency_ms})
            raise LLMOutputInvalid()

        usage = getattr(result.get("raw"), "usage_metadata", None) or {}
        meta = Meta(
            model=self._model,
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
            latency_ms=latency_ms,
            prompt_version=prompt_version,
        )
        log.info(
            "llm_call",
            extra={
                "task": task,
                "model": self._model,
                "latency_ms": latency_ms,
                "input_tokens": meta.input_tokens,
                "output_tokens": meta.output_tokens,
                "prompt_version": prompt_version,
            },
        )
        return parsed, meta
