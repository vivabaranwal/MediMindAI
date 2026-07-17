# PHASE 7: FASTAPI AI ENGINE FOUNDATION

This document details the architecture, directory layout, security filters, and endpoints of the Python FastAPI AI microservice (**medimind-ai-engine**).

---

## 1. Directory Layout & Architecture

The Python microservice implements Clean Architecture:

```
medimind-ai-engine/
│
├── core/
│   ├── config.py         ← Config settings reading from .env
│   └── security.py       ← Dependency injection for header validation
│
├── schemas/
│   └── brief.py          ← Pydantic input/output validation schemas (DTOs)
│
├── agents/
│   └── brief_generator.py← LangChain GPT-4o-mini LLM summarizing agent
│
├── services/
│   └── brief_service.py  ← Service layer orchestrating logic
│
├── routers/
│   └── briefs.py         ← FastAPI endpoint routing
│
├── main.py               ← App entry point
└── requirements.txt      ← Dependency package declarations
```

---

## 2. Security (Internal Auth Gateway)

To protect AI resources and verify that incoming calls originate from the Laravel BFF:
- A FastAPI security dependency (`verify_internal_secret`) is injected into the router.
- It parses the incoming HTTP headers for `X-Internal-Secret`.
- If missing or incorrect, it throws a `401 Unauthorized` HTTP exception, blocking unauthorized clients.

---

## 3. API Specifications (Base: `http://localhost:8000`)

### 3.1 Generate Doctor Brief Endpoint
*   **Endpoint:** `POST /api/ai/generate-brief`
*   **Headers:**
    *   `X-Internal-Secret` : `your-secret-token` (Required)
*   **Request Schema (BriefRequest):**
    ```json
    {
      "encounter_id": 1,
      "chief_complaint": "Persistent dry cough",
      "vitals": {
        "blood_pressure": "120/80",
        "heart_rate": 78,
        "temperature": 98.6,
        "spo2": 99
      },
      "symptoms": ["cough", "throat pain"]
    }
    ```
*   **Response Schema (BriefResponse):**
    ```json
    {
      "success": true,
      "brief": "Patient presents with persistent dry cough...",
      "risk_level": "low",
      "suggested_questions": [
        "How long have you had this chief complaint?",
        "Have you experienced any other symptoms like difficulty breathing?",
        "Are you taking any medication?"
      ]
    }
    ```

---

## 4. LLM Summary Agent
The `BriefGenerator` uses a LangChain prompt template linked to `gpt-4o-mini` via `ChatOpenAI`. 
*   **Resiliency Fallback:** If no OpenAI API key is configured or is invalid, the generator captures the failure gracefully and yields a parsed, structured mockup brief based on the request vitals and symptom arrays, preventing service outages.
