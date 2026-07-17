from fastapi import APIRouter, Depends
from schemas.brief import BriefRequest, BriefResponse, SoapRequest, SoapResponse
from services.brief_service import brief_service
from agents.soap_generator import SoapGenerator
from core.security import verify_internal_secret

router = APIRouter(prefix="/api/ai", tags=["briefs"])

@router.post(
    "/generate-brief",
    response_model=BriefResponse,
    dependencies=[Depends(verify_internal_secret)]
)
async def generate_brief(request: BriefRequest):
    return await brief_service.generate_brief(request)

@router.post(
    "/generate-soap",
    response_model=SoapResponse,
    dependencies=[Depends(verify_internal_secret)]
)
async def generate_soap(request: SoapRequest):
    # Fetch encounter context internally from Laravel
    import httpx
    from core.config import settings
    
    context_string = ""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"http://backend:8000/api/internal/encounter-context/{request.encounter_id}",
                headers={
                    "X-Internal-Secret": settings.INTERNAL_API_SECRET
                },
                timeout=5.0
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("success"):
                    context_string = data.get("context", "")
    except Exception as e:
        print(f"[generate_soap] Failed to fetch context: {str(e)}")

    generator = SoapGenerator()
    data = await generator.generate(request.encounter_id, context_string)
    
    return SoapResponse(
        success=True,
        subjective=data.get("subjective", ""),
        objective=data.get("objective", ""),
        assessment=data.get("assessment", ""),
        plan=data.get("plan", "")
    )
