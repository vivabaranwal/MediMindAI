from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    query: str
    encounter_id: int
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    success: bool
    response: str
    context: str
