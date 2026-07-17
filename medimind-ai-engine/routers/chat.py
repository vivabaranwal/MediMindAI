from fastapi import APIRouter, Depends, HTTPException, status
from schemas.chat import ChatRequest, ChatResponse
from agents.chat_assistant import chat_assistant_graph
from core.security import verify_internal_secret

router = APIRouter(prefix="/api/ai", tags=["chat"])

@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_internal_secret)]
)
async def chat(request: ChatRequest):
    try:
        state = {
            "query": request.query,
            "encounter_id": request.encounter_id,
            "history": request.history,
            "context": "",
            "response": ""
        }
        
        result_state = await chat_assistant_graph.ainvoke(state)
        
        return ChatResponse(
            success=True,
            response=result_state.get("response", ""),
            context=result_state.get("context", "")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during chat processing: {str(e)}"
        )
