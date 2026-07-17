from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ReportAnalysisRequest(BaseModel):
    file_path: str
    patient_id: int
    encounter_id: int

class ReportAnalysisResponse(BaseModel):
    success: bool
    summary: str
    abnormalities: List[str]
    patient_info_detected: Dict[str, Any]
