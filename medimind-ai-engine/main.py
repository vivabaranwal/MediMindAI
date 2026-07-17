from fastapi import FastAPI
from routers import briefs, reports_ai, chat

app = FastAPI(title="MediMind AI Engine", version="1.0.0")

# Register routers
app.include_router(briefs.router)
app.include_router(reports_ai.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"status": "ok", "service": "medimind-ai-engine"}

def calculate_acuity(symptoms, answers):
    # Define clinical red flags
    red_flags = ["shortness of breath", "dysphagia", "neck swelling", "stridor"]
    
    # Count occurrences
    flag_count = sum(1 for flag in red_flags if flag in answers.lower())
    
    if flag_count >= 2 or "shortness of breath" in answers.lower():
        return "HIGH ACUITY"
    elif flag_count == 1:
        return "MODERATE ACUITY"
    else:
        return "LOW ACUITY"
