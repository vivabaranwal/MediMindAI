from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from core.config import settings
from services.vector_store import vector_store

class ChatState(TypedDict):
    query: str
    encounter_id: int
    history: List[Dict[str, str]]
    context: str
    response: str

class ChatAssistantAgent:
    def __init__(self):
        self.enabled = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock")
        if self.enabled:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.3
            )
        else:
            self.llm = None

    async def retrieve_node(self, state: ChatState) -> ChatState:
        query = state["query"]
        encounter_id = state["encounter_id"]
        
        # Fetch structured, flattened clinical context string from Laravel backend
        import httpx
        laravel_context = ""
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"http://backend:8000/api/internal/encounter-context/{encounter_id}",
                    headers={
                        "X-Internal-Secret": settings.INTERNAL_API_SECRET
                    },
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("success"):
                        laravel_context = data.get("context", "")
        except Exception as e:
            print(f"[ChatAssistantAgent] Failed to fetch encounter context: {str(e)}")

        # Retrieve chunks from Qdrant filtered by encounter_id
        hits = vector_store.retrieve(query, encounter_id, top_k=3)
        
        # Format chunks into a context block
        context_parts = []
        if laravel_context:
            context_parts.append(laravel_context)
            
        for hit in hits:
            context_parts.append(f"[Source Chunk Index {hit.get('chunk_index', 0)}]: {hit.get('text_chunk', '')}")
            
        state["context"] = "\n\n".join(context_parts)
        return state

    async def generate_node(self, state: ChatState) -> ChatState:
        query = state["query"]
        context = state["context"]
        history = state.get("history", [])

        if not self.enabled:
            # Fallback mock RAG response
            evidence_tag = "No uploaded EMR context retrieved."
            if context:
                evidence_tag = f"Based on retrieved EMR context:\n{context[:200]}"
            
            state["response"] = f"[MOCK RAG RESPONSE] {evidence_tag}\n\nTo answer your query: '{query}', clinical guidelines suggest matching history."
            return state

        # Format history for prompt
        history_str = ""
        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            history_str += f"{role.capitalize()}: {content}\n"

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an evidence-based clinical reasoning assistant. Answer the doctor's query based ONLY on the provided patient context and chat history. If the context does not contain enough info, state that. Quote sources from the context headers if applicable.\n\nRetrieved Patient Context:\n{context}"),
            ("user", "Chat History:\n{history_str}\nDoctor Query: {query}")
        ])

        chain = prompt | self.llm
        try:
            res = await chain.ainvoke({
                "context": context,
                "history_str": history_str,
                "query": query
            })
            state["response"] = res.content
        except Exception as e:
            state["response"] = f"[Error generating RAG response: {str(e)}]"

        return state

    def compile_graph(self):
        workflow = StateGraph(ChatState)
        workflow.add_node("retrieve", self.retrieve_node)
        workflow.add_node("generate", self.generate_node)
        
        workflow.add_edge(START, "retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)
        
        return workflow.compile()

chat_assistant_agent = ChatAssistantAgent()
chat_assistant_graph = chat_assistant_agent.compile_graph()
