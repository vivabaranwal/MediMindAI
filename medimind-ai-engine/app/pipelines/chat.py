"""Grounded patient chat.

    retrieve -> assemble -> (no sources? stop) -> generate -> validate

Grounding policy: the model may only answer from numbered sources (the chart context
from Laravel plus this patient's retrieved report chunks). An answer that cites no valid
source is replaced with an explicit "not found in the record" response.
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.config import Settings
from app.llm.gateway import StructuredLLM
from app.prompts import tasks
from app.prompts.common import PROMPT_VERSION
from app.retrieval.store import Hit, VectorStore
from app.schemas.common import Meta
from app.schemas.documents import ChatLLMOutput, ChatRequest, ChatResponse, Citation

_NOT_FOUND = "I could not find that in this patient's record."
CHART_ID = "chart"


class ChatState(TypedDict, total=False):
    request: ChatRequest
    hits: list[Hit]
    sources: dict[str, tuple[str, str]]  # id -> (label, text)
    output: ChatLLMOutput
    meta: Meta
    response: ChatResponse


class ChatPipeline:
    def __init__(self, settings: Settings, llm: StructuredLLM, store: VectorStore):
        self._s = settings
        self._llm = llm
        self._store = store
        self._graph = self._build()

    def _build(self):
        g = StateGraph(ChatState)
        g.add_node("retrieve", self._retrieve)
        g.add_node("assemble", self._assemble)
        g.add_node("generate", self._generate)
        g.add_node("validate", self._validate)
        g.add_node("no_sources", self._no_sources)
        g.add_edge(START, "retrieve")
        g.add_edge("retrieve", "assemble")
        g.add_conditional_edges(
            "assemble", lambda s: "generate" if s["sources"] else "no_sources",
            {"generate": "generate", "no_sources": "no_sources"},
        )
        g.add_edge("generate", "validate")
        g.add_edge("validate", END)
        g.add_edge("no_sources", END)
        return g.compile()

    async def _retrieve(self, state: ChatState) -> ChatState:
        req = state["request"]
        hits = await self._store.search(
            query=req.query, patient_id=req.patient_id, top_k=self._s.RETRIEVAL_TOP_K
        )
        return {"hits": hits}

    async def _assemble(self, state: ChatState) -> ChatState:
        req = state["request"]
        sources: dict[str, tuple[str, str]] = {}
        if req.chart_context.strip():
            sources[CHART_ID] = ("Patient chart", req.chart_context.strip())
        for h in state["hits"]:
            sources[h.source_id] = (f"Report #{h.report_id}, page {h.page}", h.text)
        return {"sources": sources}

    async def _no_sources(self, state: ChatState) -> ChatState:
        meta = Meta(model="none", latency_ms=0, prompt_version=PROMPT_VERSION)
        return {"response": ChatResponse(
            answer=_NOT_FOUND + " No chart data or uploaded reports are available for this patient.",
            citations=[], insufficient_information=True, meta=meta,
        )}

    async def _generate(self, state: ChatState) -> ChatState:
        req = state["request"]
        blocks = "\n\n".join(f"[{sid}] ({label})\n{text}" for sid, (label, text) in state["sources"].items())
        history = req.history[-self._s.MAX_CHAT_HISTORY_TURNS :]
        history_text = "\n".join(f"{t.role}: {t.content}" for t in history) or "(none)"
        user = (
            f"<sources>\n{blocks}\n</sources>\n\n"
            f"Chat history (not a source of facts):\n{history_text}\n\n"
            f"Doctor's question: {req.query}"
        )
        out, meta = await self._llm.structured(
            ChatLLMOutput, task="chat", prompt_version=PROMPT_VERSION, system=tasks.CHAT, user=user
        )
        return {"output": out, "meta": meta}

    async def _validate(self, state: ChatState) -> ChatState:
        out, sources = state["output"], state["sources"]
        used = [sid for sid in dict.fromkeys(out.used_source_ids) if sid in sources]

        if not out.insufficient_information and not used:
            answer, insufficient, used = _NOT_FOUND, True, []
        else:
            answer, insufficient = out.answer, out.insufficient_information

        citations = [
            Citation(source_id=sid, label=sources[sid][0], snippet=sources[sid][1][:240])
            for sid in used
        ]
        return {"response": ChatResponse(
            answer=answer, citations=citations, insufficient_information=insufficient, meta=state["meta"]
        )}

    async def run(self, request: ChatRequest) -> ChatResponse:
        final = await self._graph.ainvoke({"request": request})
        return final["response"]
