import json
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from core.config import settings

class AnalyzerState(TypedDict):
    text: str
    findings: Dict[str, Any]
    abnormalities: List[str]
    status: str

class ReportAnalyzerAgent:
    def __init__(self):
        self.enabled = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock")
        if self.enabled:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.1
            )
        else:
            self.llm = None

    def _analyze_mock(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        abnormalities = []
        
        if "cholesterol" in text_lower:
            abnormalities.append("Serum cholesterol elevated (240 mg/dL - High)")
        if "hemoglobin" in text_lower or "hb" in text_lower:
            abnormalities.append("Hemoglobin slightly low (11.5 g/dL - Mild Anemia)")
        if "blood sugar" in text_lower or "glucose" in text_lower:
            abnormalities.append("Fasting blood glucose elevated (115 mg/dL - Prediabetes)")

        if not abnormalities:
            abnormalities.append("No critical clinical abnormalities detected.")

        return {
            "summary": "Clinical report parsed successfully.",
            "abnormalities": abnormalities,
            "patient_info_detected": {
                "name": "Detected Patient" if "name" in text_lower else "Unknown",
                "report_type": "Lab Report"
            }
        }

    async def analyze_node(self, state: AnalyzerState) -> AnalyzerState:
        text = state["text"]
        
        if not self.enabled:
            mock_data = self._analyze_mock(text)
            state["findings"] = mock_data
            state["abnormalities"] = mock_data["abnormalities"]
            state["status"] = "success"
            return state

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an AI medical report reader. Analyze the extracted report text below, identify abnormal findings or critical test results, and structure them into a valid JSON matching exactly: {{\"summary\": \"concise report summary\", \"abnormalities\": [\"abnormality 1\", \"abnormality 2\"], \"patient_info_detected\": {{\"name\": \"str\", \"report_type\": \"str\"}}}}"),
            ("user", "Report Text:\n{text}")
        ])

        chain = prompt | self.llm
        try:
            res = await chain.ainvoke({"text": text})
            content = res.content
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            parsed = json.loads(content.strip())
            state["findings"] = parsed
            state["abnormalities"] = parsed.get("abnormalities", [])
            state["status"] = "success"
        except Exception as e:
            state["findings"] = {"error": f"Failed to run LLM analyzer: {str(e)}"}
            state["abnormalities"] = ["[Error parsing report]"]
            state["status"] = "failed"
            
        return state

    def compile_graph(self):
        workflow = StateGraph(AnalyzerState)
        workflow.add_node("analyze", self.analyze_node)
        
        workflow.add_edge(START, "analyze")
        workflow.add_edge("analyze", END)
        
        return workflow.compile()

report_analyzer_agent = ReportAnalyzerAgent()
report_analyzer_graph = report_analyzer_agent.compile_graph()
