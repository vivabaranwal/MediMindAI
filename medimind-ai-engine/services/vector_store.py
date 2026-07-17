import uuid
import hashlib
import random
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from langchain_openai import OpenAIEmbeddings
from core.config import settings

class MockEmbeddings:
    def embed_query(self, text: str) -> List[float]:
        # Hash text to generate a deterministic random seed
        hasher = hashlib.md5(text.encode('utf-8'))
        seed = int(hasher.hexdigest()[:8], 16)
        rng = random.Random(seed)
        
        # Return a normalized vector of 1536 elements
        vector = [rng.uniform(-1.0, 1.0) for _ in range(1536)]
        magnitude = sum(x**2 for x in vector)**0.5
        return [x / magnitude for x in vector] if magnitude > 0 else [0.0] * 1536

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(t) for t in texts]

class VectorStore:
    def __init__(self):
        self.collection_name = "medimind_documents"
        self.client = QdrantClient(":memory:")
        
        # Determine embedding model
        self.openai_enabled = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock")
        if self.openai_enabled:
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=settings.OPENAI_API_KEY
            )
        else:
            self.embeddings = MockEmbeddings()

        # Create collection
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE),
        )

    def _split_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            if end == len(text):
                break
            start += chunk_size - chunk_overlap
        return chunks

    def add_document(self, text: str, patient_id: int, encounter_id: int) -> int:
        chunks = self._split_text(text)
        points = []
        
        for i, chunk in enumerate(chunks):
            # Embed chunk
            if self.openai_enabled:
                try:
                    vector = self.embeddings.embed_query(chunk)
                except Exception:
                    # Graceful fallback to mock embedding if API call fails
                    vector = MockEmbeddings().embed_query(chunk)
            else:
                vector = self.embeddings.embed_query(chunk)

            point_id = str(uuid.uuid4())
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "patient_id": patient_id,
                        "encounter_id": encounter_id,
                        "chunk_index": i,
                        "text_chunk": chunk
                    }
                )
            )

        if points:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
        return len(points)

    def retrieve(self, query: str, encounter_id: int, top_k: int = 3) -> List[Dict[str, Any]]:
        # Embed query
        if self.openai_enabled:
            try:
                vector = self.embeddings.embed_query(query)
            except Exception:
                vector = MockEmbeddings().embed_query(query)
        else:
            vector = self.embeddings.embed_query(query)

        # Search filtered by encounter_id metadata
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=vector,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="encounter_id",
                        match=models.MatchValue(value=encounter_id)
                    )
                ]
            ),
            limit=top_k
        )
        
        return [point.payload for point in results.points]

vector_store = VectorStore()
