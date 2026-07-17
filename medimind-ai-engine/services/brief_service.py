from agents.brief_generator import BriefGenerator
from schemas.brief import BriefRequest, BriefResponse

class BriefService:
    def __init__(self):
        self.generator = BriefGenerator()

    async def generate_brief(self, request: BriefRequest) -> BriefResponse:
        data = await self.generator.generate(
            encounter_id=request.encounter_id,
            chief_complaint=request.chief_complaint,
            vitals=request.vitals or {},
            symptoms=request.symptoms
        )
        return BriefResponse(
            success=True,
            brief=data.get("brief", ""),
            risk_level=data.get("risk_level", "low"),
            suggested_questions=data.get("suggested_questions", [])
        )

brief_service = BriefService()
