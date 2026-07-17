import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from core.config import settings

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

def classify_visit_mode(complaint: str) -> str:
    diagnostic_keywords = ['pain', 'fever', 'cough', 'injury', 'numbness', 'ache', 'symptom']
    
    complaint_lower = complaint.lower()
    if any(word in complaint_lower for word in diagnostic_keywords):
        return "MODE_DIAGNOSTIC"
    return "MODE_BASELINE"

def generate_prompt_for_mode(mode: str, complaint: str) -> str:
    if mode == "MODE_DIAGNOSTIC":
        return (
            "You are an AI Diagnostic Assistant. Analyze the patient intake data and compile a DOCTOR BRIEF summarizing the clinical case, assessing risk level, and recommending follow-up questions. "
            f"Specifically analyze the complaint: '{complaint}'. Generate targeted clinical questions about severity, duration, and radiation. "
            "Your output MUST be valid JSON matching the exact schema: {\"brief\": \"str\", \"risk_level\": \"low|medium|high|critical\", \"suggested_questions\": [\"str\"]}"
        )
    
    # Baseline Mode - The "Anti-Transcript" Logic
    return (
        "You are an AI Wellness Consultant. Analyze the patient intake data and compile a DOCTOR BRIEF summarizing the clinical case, assessing risk level, and recommending follow-up questions. "
        f"The patient presents for a general/routine visit: '{complaint}'.\n\n"
        "STRICT RULES:\n"
        "1. DO NOT ask symptom-specific questions unless the patient raises a concern.\n"
        "2. Focus on: Medication adherence, general energy levels, and specific patient-led queries.\n"
        "3. If the patient has no complaints, summarize the encounter as 'Baseline Healthy - Routine Follow-up'.\n"
        "Your output MUST be valid JSON matching the exact schema: {\"brief\": \"str\", \"risk_level\": \"low|medium|high|critical\", \"suggested_questions\": [\"str\"]}"
    )

class BriefGenerator:
    def __init__(self):
        # Initialize only if an API key is set and is not a mock key
        self.enabled = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock")
        if self.enabled:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.3
            )
        else:
            self.llm = None

    async def generate(self, encounter_id: int, chief_complaint: str, vitals: dict, symptoms: list) -> dict:
        # Pre-calculate priority weighting based on red flags
        symptoms_str = ", ".join(map(str, symptoms))
        combined_text = f"{chief_complaint} {symptoms_str}"
        acuity = calculate_acuity(symptoms, combined_text)
        
        # Triage Router — always active, regardless of LLM mode
        # Logs [AI_TRIAGE_MODE] to terminal for every encounter to confirm the router is live
        mode = classify_visit_mode(chief_complaint)
        print(f"[AI_TRIAGE_MODE]: {mode} | Encounter ID: {encounter_id} | Complaint: '{chief_complaint}'")

        risk_mapping = {
            "HIGH ACUITY": "high",
            "MODERATE ACUITY": "medium",
            "LOW ACUITY": "low"
        }
        calculated_risk = risk_mapping.get(acuity, "low")

        if not self.enabled:
            # Return a formatted mock brief if LLM is disabled
            vitals_str = ", ".join([f"{k}: {v}" for k, v in vitals.items() if v is not None])
            return {
                "brief": f"Pre-consultation summary for encounter {encounter_id}: The patient complains of '{chief_complaint}'. Vitals: {vitals_str or 'None reported'}. Key reported symptoms include: {symptoms_str or 'None reported'}.",
                "risk_level": calculated_risk,
                "suggested_questions": [
                    "How long have you had this chief complaint?",
                    "Have you experienced any other symptoms like difficulty breathing?",
                    "Are you taking any medication?"
                ]
            }

        system_prompt = generate_prompt_for_mode(mode, chief_complaint)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "Encounter ID: {encounter_id}\nChief Complaint: {chief_complaint}\nVitals: {vitals}\nSymptoms: {symptoms}")
        ])

        chain = prompt | self.llm
        try:
            res = await chain.ainvoke({
                "encounter_id": encounter_id,
                "chief_complaint": chief_complaint,
                "vitals": json.dumps(vitals),
                "symptoms": json.dumps(symptoms)
            })
            content = res.content
            # Strip any markdown code fences if present in the model's response
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            parsed = json.loads(content.strip())
            
            # Post-process or override with clinical priority weighting safety block
            if calculated_risk == "high":
                parsed["risk_level"] = "high"
            elif calculated_risk == "medium" and parsed.get("risk_level") == "low":
                parsed["risk_level"] = "medium"
                
            return parsed
        except Exception as e:
            # Fallback on exceptions
            return {
                "brief": f"[Error generating AI summary: {str(e)}] Chief complaint: {chief_complaint}. Vitals: {vitals}.",
                "risk_level": calculated_risk,
                "suggested_questions": ["Please verify history manually."]
            }
