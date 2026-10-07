"""Report ingestion: bytes in, structured findings + searchable index out.

LangGraph is used here because the stages are distinct, ordered and individually
loggable (and likely to grow: classification-based branching, voice, image analysis).

    extract -> structure -> validate -> index
"""

import asyncio
import time
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.config import Settings
from app.core.logging import get_logger
from app.documents.chunking import chunk_pages
from app.documents.extract import DocumentExtractor, ExtractedDocument
from app.llm.gateway import StructuredLLM
from app.prompts import tasks
from app.prompts.common import PROMPT_VERSION
from app.retrieval.store import VectorStore
from app.schemas.common import Meta
from app.schemas.documents import (
    ExtractionInfo,
    LabValue,
    ReportFindingsLLMOutput,
    ReportIngestResponse,
)
from app.validation.lab_values import reconcile_flag

log = get_logger("report_ingest")
_MAX_PROMPT_CHARS = 60_000


class IngestState(TypedDict, total=False):
    data: bytes
    report_id: int
    patient_id: int
    encounter_id: int | None
    extracted: ExtractedDocument
    findings: ReportFindingsLLMOutput
    values: list[LabValue]
    abnormalities: list[str]
    observations: list[str]
    meta: Meta
    chunks_indexed: int


def _document_text(doc: ExtractedDocument) -> tuple[str, bool]:
    parts = [f"--- Page {p.number} ---\n{p.text}" for p in doc.pages if p.text.strip()]
    text = "\n\n".join(parts)
    if len(text) > _MAX_PROMPT_CHARS:
        return text[:_MAX_PROMPT_CHARS], True
    return text, False


class ReportIngestPipeline:
    def __init__(self, settings: Settings, extractor: DocumentExtractor, llm: StructuredLLM, store: VectorStore):
        self._s = settings
        self._extractor = extractor
        self._llm = llm
        self._store = store
        self._graph = self._build()

    def _build(self):
        g = StateGraph(IngestState)
        g.add_node("extract", self._extract)
        g.add_node("structure", self._structure)
        g.add_node("validate", self._validate)
        g.add_node("index", self._index)
        g.add_edge(START, "extract")
        g.add_edge("extract", "structure")
        g.add_edge("structure", "validate")
        g.add_edge("validate", "index")
        g.add_edge("index", END)
        return g.compile()

    # --------------------------------------------------------------- stages

    async def _extract(self, state: IngestState) -> IngestState:
        started = time.monotonic()
        doc = await asyncio.to_thread(self._extractor.extract, state["data"])
        log.info("stage_extract", extra={
            "report_id": state["report_id"], "pages": len(doc.pages), "ocr_pages": doc.ocr_pages,
            "chars": doc.characters, "ms": int((time.monotonic() - started) * 1000),
        })
        return {"extracted": doc}

    async def _structure(self, state: IngestState) -> IngestState:
        text, truncated = _document_text(state["extracted"])
        findings, meta = await self._llm.structured(
            ReportFindingsLLMOutput, task="report_extraction", prompt_version=PROMPT_VERSION,
            system=tasks.REPORT_EXTRACTION, user=f"<document>\n{text}\n</document>",
        )
        observations = list(findings.observations)
        if truncated:
            observations.append("Only the first part of a very long document was analysed.")
        return {"findings": findings, "meta": meta, "observations": observations}

    async def _validate(self, state: IngestState) -> IngestState:
        values = [reconcile_flag(v) for v in state["findings"].values]
        abnormalities = list(state["findings"].abnormalities)

        # Anything the arithmetic marks abnormal must be surfaced even if the model omitted it.
        mentioned = " ".join(abnormalities).lower()
        for v in values:
            if v.flag in ("low", "high", "critical") and v.name.lower() not in mentioned:
                unit = f" {v.unit}" if v.unit else ""
                ref = f" (reference {v.reference_range})" if v.reference_range else ""
                abnormalities.append(f"{v.name}: {v.value}{unit} is {v.flag}{ref}.")
        return {"values": values, "abnormalities": abnormalities}

    async def _index(self, state: IngestState) -> IngestState:
        chunks = chunk_pages(state["extracted"].pages, self._s.CHUNK_CHARS, self._s.CHUNK_OVERLAP_CHARS)
        count = await self._store.upsert_report(
            report_id=state["report_id"], patient_id=state["patient_id"],
            encounter_id=state.get("encounter_id"), chunks=chunks,
        )
        log.info("stage_index", extra={"report_id": state["report_id"], "chunks": count})
        return {"chunks_indexed": count}

    # ------------------------------------------------------------------ api

    async def run(
        self, *, data: bytes, report_id: int, patient_id: int, encounter_id: int | None
    ) -> ReportIngestResponse:
        final = await self._graph.ainvoke({
            "data": data, "report_id": report_id, "patient_id": patient_id, "encounter_id": encounter_id,
        })
        doc, f = final["extracted"], final["findings"]
        return ReportIngestResponse(
            report_id=report_id,
            extraction=ExtractionInfo(
                pages=len(doc.pages), ocr_pages=doc.ocr_pages, characters=doc.characters,
                low_confidence_pages=doc.low_confidence_pages,
            ),
            document_type=f.document_type,
            summary=f.summary,
            patient_name_detected=f.patient_name,
            report_date=f.report_date,
            values=final["values"],
            abnormalities=final["abnormalities"],
            observations=final["observations"],
            chunks_indexed=final["chunks_indexed"],
            meta=final["meta"],
        )
