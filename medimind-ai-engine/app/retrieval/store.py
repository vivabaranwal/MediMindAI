"""Vector index of report chunks (Qdrant).

Every query is filtered by patient_id: retrieval can never cross patients.
"""

import asyncio
import uuid
from dataclasses import dataclass

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from app.core.config import Settings
from app.core.errors import RetrievalError
from app.core.logging import get_logger
from app.documents.chunking import Chunk
from app.llm.embeddings import Embedder

log = get_logger("retrieval")
_NAMESPACE = uuid.UUID("5b0f4d5e-7d1c-4e0e-9a41-0a6c6f1b2c11")
_EMBED_BATCH = 64


@dataclass(frozen=True)
class Hit:
    source_id: str
    report_id: int
    page: int
    text: str
    score: float


def make_client(settings: Settings) -> QdrantClient:
    if settings.QDRANT_URL == ":memory:":
        return QdrantClient(location=":memory:")
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY, timeout=30)


class VectorStore:
    def __init__(self, client: QdrantClient, embedder: Embedder, settings: Settings):
        self._client = client
        self._embedder = embedder
        self._collection = settings.QDRANT_COLLECTION
        self._dim = settings.EMBEDDING_DIM
        self._ready = False

    # ------------------------------------------------------------ lifecycle

    def _ensure_collection_sync(self) -> None:
        if self._ready:
            return
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=qm.VectorParams(size=self._dim, distance=qm.Distance.COSINE),
            )
        for field in ("patient_id", "report_id", "encounter_id"):
            try:
                self._client.create_payload_index(self._collection, field, qm.PayloadSchemaType.INTEGER)
            except Exception:
                pass  # already exists, or local mode (no payload indexes)
        self._ready = True

    async def _run(self, fn, *args, **kwargs):
        try:
            return await asyncio.to_thread(fn, *args, **kwargs)
        except RetrievalError:
            raise
        except Exception as exc:
            log.error("vector_store_failed", extra={"error_type": type(exc).__name__})
            raise RetrievalError() from exc

    async def ping(self) -> bool:
        try:
            await self._run(self._ensure_collection_sync)
            return True
        except RetrievalError:
            return False

    # --------------------------------------------------------------- writes

    async def upsert_report(
        self, *, report_id: int, patient_id: int, encounter_id: int | None, chunks: list[Chunk]
    ) -> int:
        await self._run(self._ensure_collection_sync)
        await self._run(self._delete_report_sync, report_id)  # idempotent re-ingest
        if not chunks:
            return 0

        vectors: list[list[float]] = []
        for i in range(0, len(chunks), _EMBED_BATCH):
            batch = chunks[i : i + _EMBED_BATCH]
            vectors.extend(await self._embedder.embed_documents([c.text for c in batch]))

        points = [
            qm.PointStruct(
                id=str(uuid.uuid5(_NAMESPACE, f"{report_id}:{c.index}")),
                vector=vec,
                payload={
                    "report_id": report_id,
                    "patient_id": patient_id,
                    "encounter_id": encounter_id,
                    "page": c.page,
                    "chunk_index": c.index,
                    "text": c.text,
                },
            )
            for c, vec in zip(chunks, vectors, strict=True)
        ]
        await self._run(self._client.upsert, collection_name=self._collection, points=points, wait=True)
        return len(points)

    def _delete_report_sync(self, report_id: int) -> None:
        self._client.delete(
            collection_name=self._collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(must=[qm.FieldCondition(key="report_id", match=qm.MatchValue(value=report_id))])
            ),
            wait=True,
        )

    async def delete_report(self, report_id: int) -> None:
        await self._run(self._ensure_collection_sync)
        await self._run(self._delete_report_sync, report_id)

    # ---------------------------------------------------------------- reads

    async def search(self, *, query: str, patient_id: int, top_k: int) -> list[Hit]:
        await self._run(self._ensure_collection_sync)
        vector = await self._embedder.embed_query(query)
        must = [qm.FieldCondition(key="patient_id", match=qm.MatchValue(value=patient_id))]
        result = await self._run(
            self._client.query_points,
            collection_name=self._collection,
            query=vector,
            query_filter=qm.Filter(must=must),
            limit=top_k,
            with_payload=True,
        )
        hits = []
        for p in result.points:
            pl = p.payload or {}
            hits.append(Hit(
                source_id=f"report:{pl['report_id']}:p{pl['page']}:c{pl['chunk_index']}",
                report_id=pl["report_id"], page=pl["page"], text=pl["text"], score=p.score,
            ))
        return hits
