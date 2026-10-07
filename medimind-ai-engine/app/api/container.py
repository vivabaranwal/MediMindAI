from dataclasses import dataclass

from app.core.config import Settings
from app.documents.extract import DocumentExtractor
from app.documents.ocr import OcrEngine, TesseractOcr
from app.llm.embeddings import Embedder, OpenAIEmbedder
from app.llm.gateway import OpenAIGateway, StructuredLLM
from app.pipelines.chat import ChatPipeline
from app.pipelines.clinical import ClinicalPipelines
from app.pipelines.report_ingest import ReportIngestPipeline
from app.retrieval.store import VectorStore, make_client


@dataclass
class Services:
    settings: Settings
    ocr: OcrEngine
    store: VectorStore
    clinical: ClinicalPipelines
    reports: ReportIngestPipeline
    chat: ChatPipeline


def build_services(
    settings: Settings,
    *,
    llm: StructuredLLM | None = None,
    embedder: Embedder | None = None,
    ocr: OcrEngine | None = None,
    qdrant_client=None,
) -> Services:
    """Wire the object graph. Production passes nothing and gets the real providers;
    tests pass their own doubles for the provider boundaries only."""
    llm = llm or OpenAIGateway(settings)
    embedder = embedder or OpenAIEmbedder(settings)
    ocr = ocr or TesseractOcr(settings.OCR_LANGS)
    store = VectorStore(qdrant_client or make_client(settings), embedder, settings)
    extractor = DocumentExtractor(settings, ocr)
    return Services(
        settings=settings,
        ocr=ocr,
        store=store,
        clinical=ClinicalPipelines(llm),
        reports=ReportIngestPipeline(settings, extractor, llm, store),
        chat=ChatPipeline(settings, llm, store),
    )
