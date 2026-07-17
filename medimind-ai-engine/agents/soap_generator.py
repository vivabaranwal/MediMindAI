import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from core.config import settings

class SoapGenerator:
    def __init__(self):
        self.enabled = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock")
        if self.enabled:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.3
            )
        else:
            self.llm = None

    async def generate(self, encounter_id: int, context_string: str) -> dict:
        if not self.enabled:
            # Return a parsed mock SOAP note structure
            is_general = "General Consultation" in context_string or "Routine Health Maintenance" in context_string
            assessment_val = "Routine health maintenance" if is_general else "Acute clinical findings consistent with upper respiratory inflammation."
            
            return {
                "subjective": "Patient presents with chief complaint as noted. Discomfort is active, but patient denies acute distress.",
                "objective": "Vitals reviewed. Blood pressure and heart rate are within normal physiological range for age.",
                "assessment": assessment_val,
                "plan": "Schedule routine clinical follow-up as indicated; patient to return if symptoms worsen."
            }

        prompt = ChatPromptTemplate.from_messages([
            ("system", 
             "You are a Senior Consultant Physician. Generate a professional, structured clinical SOAP note in the third person based on the provided patient context. "
             "Use formal medical terminology (e.g., write 'patient denies significant distress' instead of 'patient said no').\n\n"
             "STRICT RULES:\n"
             "1. Define the Schema (JSON Enforcement): Output ONLY a valid JSON object matching this schema:\n"
             "   {{\"subjective\": \"A 2-3 sentence narrative of the patient's concerns, excluding all Q&A dialogue.\",\n"
             "    \"objective\": \"A summary of vitals, including a note on whether they are within normal range for the patient's age.\",\n"
             "    \"assessment\": \"An interpretation of the data, e.g., 'Patient remains stable post-intake, no acute symptoms reported'.\",\n"
             "    \"plan\": \"Action items based on findings, e.g., 'Routine follow-up in 3 months'.\"}}\n\n"
             "2. Synthesis vs. Transcription Filter (Negative Constraints):\n"
             "   - DO NOT include Q&A pairs, bulleted lists of denied symptoms, or conversational filler in the final output.\n"
             "   - The goal is a formal medical record note.\n"
             "   - If a value is negative/denied, summarize it as 'Negative for acute distress' (or similar professional phrasing) rather than listing 'No' answers.\n\n"
             "3. Cross-Reference Logic:\n"
             "   - Prioritize the saved Symptom findings and SoapNote entries over any raw transcripts.\n"
             "   - If the Chief Complaint was 'General Consultation' or similar routine follow-up, the 'assessment' field must automatically default to 'Routine health maintenance' unless specific active symptoms were reported.\n\n"
             "Your output MUST contain ONLY raw JSON (no markdown block wrapper, no leading/trailing text)."
            ),
            ("user", "Patient Context:\n{context_string}")
        ])

        chain = prompt | self.llm
        try:
            res = await chain.ainvoke({
                "context_string": context_string
            })
            content = res.content.strip()
            # Strip any markdown code fences if present in the model's response
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            parsed = json.loads(content.strip())
            return {
                "subjective": parsed.get("subjective", ""),
                "objective": parsed.get("objective", ""),
                "assessment": parsed.get("assessment", ""),
                "plan": parsed.get("plan", "")
            }
        except Exception as e:
            return {
                "subjective": f"[Error generating SOAP subjective: {str(e)}]",
                "objective": "Error loading vitals details.",
                "assessment": "Error analyzing clinical findings.",
                "plan": "Verify history and plan manually."
            }
