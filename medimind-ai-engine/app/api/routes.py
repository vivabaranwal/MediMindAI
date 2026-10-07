from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.api.container import Services
from app.core.errors import FileRejected, FileTooLarge
from app.core.security import require_internal_secret
from app.schemas.clinical import (
    BriefRequest,
    BriefResponse,
    IntakeQuestionsRequest,
    IntakeQuestionsResponse,
    IntakeSummaryRequest,
    IntakeSummaryResponse,
    PrescriptionCheckRequest,
    PrescriptionCheckResponse,
    SoapRequest,
    SoapResponse,
    SuggestionsRequest,
    SuggestionsResponse,
)
from app.schemas.documents import ChatRequest, ChatResponse, ReportDeleteResponse, ReportIngestResponse


def get_services(request: Request) -> Services:
    return request.app.state.services


router = APIRouter(prefix="/internal/v1", dependencies=[Depends(require_internal_secret)])


@router.post("/briefs", response_model=BriefResponse)
async def create_brief(body: BriefRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.brief(body)


@router.post("/soap", response_model=SoapResponse)
async def create_soap(body: SoapRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.soap(body)


@router.post("/intake/questions", response_model=IntakeQuestionsResponse)
async def intake_questions(body: IntakeQuestionsRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.intake_questions(body)


@router.post("/intake/summary", response_model=IntakeSummaryResponse)
async def intake_summary(body: IntakeSummaryRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.intake_summary(body)


@router.post("/suggestions", response_model=SuggestionsResponse)
async def suggestions(body: SuggestionsRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.suggestions(body)


@router.post("/prescriptions/check", response_model=PrescriptionCheckResponse)
async def prescription_check(body: PrescriptionCheckRequest, svc: Services = Depends(get_services)):
    return await svc.clinical.prescription_check(body)


@router.post("/reports/ingest", response_model=ReportIngestResponse)
async def ingest_report(
    file: UploadFile = File(...),
    report_id: int = Form(...),
    patient_id: int = Form(...),
    encounter_id: int | None = Form(default=None),
    svc: Services = Depends(get_services),
):
    limit = svc.settings.MAX_UPLOAD_BYTES
    data = await file.read(limit + 1)  # never buffer more than limit + 1 bytes
    if len(data) > limit:
        raise FileTooLarge()
    if not data:
        raise FileRejected("The file is empty.")
    return await svc.reports.run(
        data=data, report_id=report_id, patient_id=patient_id, encounter_id=encounter_id
    )


@router.delete("/reports/{report_id}", response_model=ReportDeleteResponse)
async def delete_report(report_id: int, svc: Services = Depends(get_services)):
    await svc.store.delete_report(report_id)
    return ReportDeleteResponse(report_id=report_id, deleted=True)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, svc: Services = Depends(get_services)):
    return await svc.chat.run(body)


# Unauthenticated, content-free probes for the orchestrator (Docker/Kubernetes).
probes = APIRouter()


@probes.get("/health")
async def health():
    return {"status": "ok"}


@probes.get("/ready")
async def ready(svc: Services = Depends(get_services)):
    index_ok = await svc.store.ping()
    ocr_ok = svc.ocr.is_available()
    return {"status": "ok" if index_ok and ocr_ok else "degraded", "index": index_ok, "ocr": ocr_ok}
