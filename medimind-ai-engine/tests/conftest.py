"""Test harness.

Only the three provider boundaries are replaced (LLM, embeddings, OCR). Everything
else is real: PyMuPDF, the chunker, an in-memory Qdrant, LangGraph and FastAPI.
"""

import hashlib
import io
import os
import re

import pymupdf as fitz
import pytest
from fastapi.testclient import TestClient
from PIL import Image

SECRET = "test-secret-0123456789-abcdefghij"

os.environ.setdefault("INTERNAL_API_SECRET", SECRET)
os.environ.setdefault("OPENAI_API_KEY", "sk-test-0123456789abcdefghij")
os.environ.setdefault("QDRANT_URL", ":memory:")
os.environ.setdefault("EMBEDDING_DIM", "64")

from app.api.container import build_services  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402

HEADERS = {"X-Internal-Secret": SECRET}


class FakeLLM:
    """Returns pre-scripted structured outputs keyed by schema class name and records calls."""

    def __init__(self):
        self.script: dict = {}
        self.calls: list[dict] = []
        self.error: Exception | None = None

    def will_return(self, schema, value):
        self.script[schema.__name__] = value

    async def structured(self, schema, *, task, prompt_version, system, user):
        from app.schemas.common import Meta

        self.calls.append({"task": task, "system": system, "user": user, "schema": schema.__name__})
        if self.error:
            raise self.error
        value = self.script[schema.__name__]
        value = value(user) if callable(value) else value
        return value, Meta(model="fake-model", input_tokens=10, output_tokens=5, latency_ms=1, prompt_version=prompt_version)


class HashEmbedder:
    """Deterministic bag-of-words embedding: texts sharing words have higher cosine similarity."""

    def __init__(self, dim: int):
        self.dim = dim

    def _vec(self, text: str) -> list[float]:
        v = [0.0] * self.dim
        for word in re.findall(r"[a-z0-9]+", text.lower()):
            v[int(hashlib.md5(word.encode()).hexdigest(), 16) % self.dim] += 1.0
        norm = sum(x * x for x in v) ** 0.5 or 1.0
        return [x / norm for x in v]

    async def embed_documents(self, texts):
        return [self._vec(t) for t in texts]

    async def embed_query(self, text):
        return self._vec(text)


class FakeOcr:
    def __init__(self):
        self.text = "SCANNED REPORT Hemoglobin 9.1 g/dL reference 12.0-16.0 patient Asha Verma"
        self.calls = 0

    def image_to_text(self, png_bytes: bytes) -> str:
        self.calls += 1
        return self.text

    def is_available(self) -> bool:
        return True


@pytest.fixture
def settings():
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def llm():
    return FakeLLM()


@pytest.fixture
def ocr():
    return FakeOcr()


@pytest.fixture
def services(settings, llm, ocr):
    import qdrant_client

    return build_services(
        settings, llm=llm, embedder=HashEmbedder(settings.EMBEDDING_DIM), ocr=ocr,
        qdrant_client=qdrant_client.QdrantClient(location=":memory:"),
    )


@pytest.fixture
def client(services):
    with TestClient(create_app(services), raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------- file builders


def make_text_pdf(*pages: str) -> bytes:
    doc = fitz.open()
    for text in pages:
        page = doc.new_page()
        page.insert_textbox(fitz.Rect(40, 40, 550, 800), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def make_scanned_pdf() -> bytes:
    """A PDF page that is only a picture: no text layer."""
    img = Image.new("RGB", (300, 200), "white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(fitz.Rect(50, 50, 350, 250), stream=buf.getvalue())
    data = doc.tobytes()
    doc.close()
    return data


def make_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (120, 80), "white").save(buf, format="PNG")
    return buf.getvalue()
