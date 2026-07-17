from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class BriefRequest(BaseModel):
    encounter_id: int
    chief_complaint: str
    vitals: Optional[Dict[str, Any]] = None
    symptoms: List[Any] = []

class BriefResponse(BaseModel):
    success: bool
    brief: str
    risk_level: str
    suggested_questions: List[str]

class SoapRequest(BaseModel):
    encounter_id: int

class SoapResponse(BaseModel):
    success: bool
    subjective: str
    objective: str
    assessment: str
    plan: str
