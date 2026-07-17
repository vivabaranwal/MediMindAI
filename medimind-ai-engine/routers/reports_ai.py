from fastapi import APIRouter, Depends, HTTPException, status
from schemas.report import ReportAnalysisRequest, ReportAnalysisResponse
from services.document_processor import document_processor
from services.vector_store import vector_store
from agents.report_analyzer import report_analyzer_graph
from core.security import verify_internal_secret

router = APIRouter(prefix="/api/ai", tags=["reports"])

@router.post(
    "/analyze-report",
    response_model=ReportAnalysisResponse,
    dependencies=[Depends(verify_internal_secret)]
)
async def analyze_report(request: ReportAnalysisRequest):
    try:
        # 1. Extract text from PDF
        text = document_processor.extract_text_from_pdf(request.file_path)
        
        # 2. Add text chunks to Vector Store (RAG)
        vector_store.add_document(
            text=text,
            patient_id=request.patient_id,
            encounter_id=request.encounter_id
        )
        
        # 3. Run Report Analyzer Graph to extract structured findings
        state = {
            "text": text,
            "findings": {},
            "abnormalities": [],
            "status": "pending"
        }
        
        result_state = await report_analyzer_graph.ainvoke(state)
        
        if result_state.get("status") == "failed":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result_state.get("findings", {}).get("error", "Failed to analyze report.")
            )
            
        findings = result_state.get("findings", {})
        
        return ReportAnalysisResponse(
            success=True,
            summary=findings.get("summary", ""),
            abnormalities=result_state.get("abnormalities", []),
            patient_info_detected=findings.get("patient_info_detected", {})
        )
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during report processing: {str(e)}"
        )
