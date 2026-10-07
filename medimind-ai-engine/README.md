# MediMind AI Engine

Private FastAPI service. It is called only by the Laravel backend and is **not** exposed to browsers.
Laravel owns all patient data and sends the context needed for each call; this service is stateless
apart from the vector index of report chunks.

## Layout

```
app/
  main.py            app factory, request-id middleware, error envelope
  api/               routes + service container (dependency wiring)
  core/              settings (fail-fast), typed errors, security, structured logging
  llm/               OpenAI chat gateway + embeddings (the only provider-specific code)
  prompts/           versioned prompts
  schemas/           request/response contracts and strict LLM output schemas
  documents/         file validation, PDF text layer, OCR fallback (Tesseract), chunking
  retrieval/         Qdrant store; every query is filtered by patient_id
  pipelines/         clinical.py (brief, SOAP, intake, suggestions, Rx check),
                     report_ingest.py and chat.py (LangGraph graphs)
  validation/        deterministic safety rules (red flags, drug allergies, lab flags)
```

## API (`/internal/v1`, header `X-Internal-Secret`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/briefs` | Pre-consultation doctor brief + risk level |
| POST | `/soap` | Draft SOAP note |
| POST | `/intake/questions` | Next intake questions for the junior doctor |
| POST | `/intake/summary` | Structured case summary |
| POST | `/suggestions` | Differentials, investigations, draft medications |
| POST | `/prescriptions/check` | Allergy (rule) + interaction (model) alerts |
| POST | `/reports/ingest` | multipart file -> extract/OCR -> findings -> index |
| DELETE | `/reports/{id}` | Remove a report from the index |
| POST | `/chat` | Grounded, cited answer for one patient |

`GET /health` (liveness) and `GET /ready` (index + OCR) are unauthenticated and return no data.

Errors are always `{"error": {"code", "message", "request_id"}}` with a real HTTP status
(422 validation, 400/413/415 file, 422 `ocr_failed`, 502 LLM, 503 retrieval/OCR unavailable).
The service never returns 200 with error text in the payload.

## Safety design

- Red-flag risk floors are computed in code; the model can raise risk but never lower it below the floor.
- Drug-allergy contraindications are rule-based; model alerts are labelled `source: "model"`.
- Lab flags are re-derived from the printed reference range.
- Chat answers must cite a provided source; uncited answers are replaced by "not found in record".
- Logs carry ids, timings and token counts only, never clinical text.

## Configuration

See `.env.example`. `INTERNAL_API_SECRET` (24+ chars) and `OPENAI_API_KEY` are required; placeholder values are rejected.

## Develop and test

```bash
python -m venv venv && venv\Scripts\activate          # Windows
pip install -r requirements-dev.txt
pytest                                                 # no network, no API key needed
```

Tests replace only the LLM, embedding and OCR providers; PDF parsing, chunking, Qdrant (in memory),
LangGraph and FastAPI run for real. Real OCR requires Tesseract with `eng` and `hin` language data
(installed in the Docker image).
