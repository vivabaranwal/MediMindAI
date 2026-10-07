# Architecture

## 1. Components and responsibilities

| Component | Owns | Does not do |
|---|---|---|
| **Frontend** (Next.js) | UI, client state (Zustand), role-based navigation | Talk to the AI engine; hold any service secret; invent clinical data |
| **Laravel API** | Authentication (Sanctum), authorisation (roles), all persistent data, consent, audit log, drug-allergy rules, queueing | Run models or OCR |
| **Queue worker** (Laravel) | Background report analysis with retry/back-off | |
| **AI engine** (FastAPI) | Prompts, LLM calls, OCR, chunking, embeddings, retrieval, deterministic triage rules | Store patient records; accept calls from anything except Laravel |
| **PostgreSQL** | System of record | |
| **Qdrant** | Embedded chunks of uploaded reports (filtered per patient) | Hold the source of truth |

Why this shape: Laravel already owned auth, roles and the data, so it stays the single entry point and enforcement layer. The AI engine is a stateless worker behind it, so it can change models or pipelines without touching the app, and nothing sensitive is reachable except through authorisation.

### AI engine layout

```
app/
  api/         routes + dependency container
  core/        fail-fast settings, typed errors, auth, structured logging
  llm/         the only provider-specific code (chat gateway, embeddings)
  prompts/     versioned prompts
  schemas/     API contracts and strict LLM output schemas
  documents/   file validation, PDF text layer, OCR (Tesseract), chunking
  retrieval/   Qdrant store (every query filtered by patient_id)
  pipelines/   clinical.py (brief, SOAP, intake, suggestions, Rx review)
               report_ingest.py, chat.py   (LangGraph graphs)
  validation/  deterministic safety rules: red flags, lab-flag reconciliation
```

LangGraph is used for the two multi-stage flows (report ingest and chat), where distinct, ordered, individually loggable stages and conditional edges (for example "no sources: stop without calling the model") earn their keep. Single-step generation (brief, SOAP, ...) is a plain function call. The original `.dev` plan specified LangGraph with a supervisor; nothing there called for removing it, so it stays and can host the planned agents later.

## 2. Data flows

### Scenario 1: junior doctor starts an intake
1. UI → `POST /api/appointments/{id}/intake/questions` (complaint, vitals).
2. Laravel checks the role and the patient's AI consent, builds patient facts (age, gender, allergies, history, medications) and calls the engine.
3. Engine → LLM (strict JSON schema) → questions, minus any already asked → Laravel → UI.
4. After answers, `POST …/intake/summary` returns the case summary. The engine computes red flags **in code** from the answers and raises the risk if the model was lower. The handoff (`POST /api/appointments/{id}/assessment`) stores vitals, Q&A, summary and red flags, and reassigns the case to the chosen senior doctor.

### Scenario 2: a document is uploaded
```
upload (Laravel validates type/size, stores file, status=pending_analysis)
  → AnalyzeReportJob (queue)
      → consent? no: status=not_analyzed (nothing sent anywhere)
      → engine /reports/ingest (multipart)
          extract: sniff real type from bytes; reject encrypted/corrupt/oversized/too many pages
                   PDF: text layer; pages without one are rendered and OCR'd (Tesseract eng+hin)
                   image: OCR
          structure: LLM → document type, summary, patient name, values + reference ranges, abnormalities
          validate: re-derive each low/high flag from the printed range; surface anything abnormal the model missed
          index: chunk by page (never across pages), embed, upsert to Qdrant with patient/report ids
      → Laravel stores findings, model name, warnings (patient_name_mismatch, low_confidence_ocr)
  transient AI failure → retried (30s, 120s); permanent (unreadable file) → status=failed + reason
```

### Scenario 3: a doctor asks about an uploaded document
`POST /api/encounters/{id}/chat` → Laravel (role + consent) builds the **chart context** (demographics, vitals, allergies, history, intake answers, SOAP) → engine:
`retrieve` (top-k chunks for this patient) → `assemble` sources `[chart]`, `[report:ID:pPAGE:cN]` → if no sources, stop → `generate` (must cite) → `validate` (drop invalid citations; uncited answer replaced with "not found in the record").

### Scenario 4: a scanned page
Same as scenario 2: a PDF page with no text layer (or an image) is OCR'd locally. Pages that yield too little text are reported as low-confidence; a document with essentially no readable text is rejected (`ocr_failed`).

### Scenario 5: question spanning several documents
Retrieval is by patient, not by report, so the top chunks can come from several reports. Each chunk is cited as `Report #id, page n`.

### Scenario 6: external tool or API
No external tools are wired into the AI. The one external dependency is the LLM provider. The design leaves room (LangGraph conditional edges) but nothing speculative is built.

## 3. RAG decisions

| Aspect | Choice | Why |
|---|---|---|
| Chunking | By page, on paragraph boundaries, ~1500 chars, 150 overlap | Chunks can be cited by page; tables stay together |
| Embedding | `text-embedding-3-small` (1536-d) | Cheap, adequate; **no fallback vectors** (a failed embed fails the operation) |
| Store | Qdrant (server mode, persistent volume) | Payload filtering by `patient_id` |
| Filter | Always `patient_id` | Retrieval cannot cross patients |
| top-k | 6, no reranker | Reports per patient are few; add a reranker only if retrieval quality measurably needs it |
| Citations | Source id + label + snippet | Doctors can verify against the record |

The structured chart (allergies, vitals, SOAP) is passed as an authoritative source from the database instead of being embedded, so facts that live in tables are never "retrieved" approximately.

## 4. API structure

Public (Laravel, `/api`, Sanctum bearer token):

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` (password or OTP), `POST /auth/send-otp`, `POST /auth/logout`, `GET /user` |
| Directory | `GET /doctors` |
| Patients | `apiResource /patients`, `POST /patients/{id}/consents` |
| Appointments | `GET /appointments/queue`, `apiResource /appointments`, `POST /appointments/{id}/assessment` |
| Intake AI | `POST /appointments/{id}/intake/questions`, `…/intake/summary` |
| Encounters | `GET /encounters`, `GET /encounters/{id}`, `POST …/complete` |
| Brief | `GET /ai/briefs/{encounter}`, `POST /ai/briefs/{encounter}/regenerate` |
| SOAP | `GET/PUT /encounters/{id}/soap`, `POST …/soap/generate`, `POST …/sign` |
| Suggestions / chat | `POST /encounters/{id}/suggestions`, `POST /encounters/{id}/chat` |
| Prescriptions | `GET/POST /prescriptions`, `POST /prescriptions/check`, `POST /prescriptions/{id}/approve` |
| Reports | `POST /reports/upload`, `GET /reports`, `GET /reports/{id}`, `…/download`, `POST …/reanalyze`, `DELETE /reports/{id}` |
| Follow-ups / outcomes / analytics | unchanged |
| Admin | `apiResource /admin/users`, `GET /admin/overview`, `GET /admin/audit-logs` |

`GET` endpoints never generate: `GET …/brief` and `GET …/soap` return `404` with `code` (`brief_not_generated`, `soap_not_generated`) until the matching `POST` runs.

Private (AI engine, `/internal/v1`, `X-Internal-Secret`): `briefs`, `soap`, `intake/questions`, `intake/summary`, `suggestions`, `prescriptions/check`, `reports/ingest`, `reports/{id}` (DELETE), `chat`. `GET /health` and `/ready` are open and content-free.

## 5. Errors

Both services return a stable `code` and a real HTTP status; neither returns 200 with an error string.

| Class | Engine code | Laravel code → HTTP |
|---|---|---|
| Validation | `validation_error` 422 | Laravel validation 422 |
| Auth | `unauthorized` 401 | hidden from users as `ai_not_configured` 503 (logged critical) |
| File | `file_rejected`/`file_too_large`/`unsupported_file_type` 400/413/415 | 422 (report stored as `failed`, reason kept) |
| OCR | `ocr_failed` 422, `ocr_unavailable` 503 | 422 / 503 (retryable) |
| LLM | `llm_error`, `llm_output_invalid` 502 | 502 (retryable) |
| Retrieval | `retrieval_error` 503 | 503 (retryable) |
| Consent | n/a | `ai_consent_required` 403 |
| Unreachable | n/a | `ai_unreachable` 503 |
| Safety | n/a | `critical_allergy_alert` 422 (approval blocked) |

Nothing is persisted when an AI call fails (no placeholder brief or SOAP). Transient report-analysis failures are retried by the queue; permanent ones are recorded on the report.

## 6. Observability

- A request id (`X-Request-ID`) flows Laravel → engine and is returned on every response and in error bodies.
- Engine logs are JSON, one line per event: request id, task, model, latency, input/output tokens, prompt version, pipeline stage, error class.
- **Never logged:** complaints, answers, document text, prompts, model output, secrets. Tests assert this.
- Laravel logs identifiers and timings for AI calls; the audit log records who changed what and *which fields* (not their values).
- Token usage and latency of each brief are stored on the brief (`llm_model_used`, `token_count`, `generation_time_ms`) from the engine's measurements, not defaults.

## 7. Test strategy

| Layer | Focus |
|---|---|
| Engine unit | red-flag rules incl. negation, lab-flag arithmetic, file validation (encrypted, corrupt, wrong type, size, pages), chunking |
| Engine API | auth on every route, typed errors never as 200, validation errors don't echo input, ingest→chat journey, patient isolation, grounding, logs contain no clinical text |
| Backend feature | auth abuse (no register, OTP single-use/locked/rate-limited), roles, consent gating, exact payloads sent to the engine, error mapping, job retry/exhaustion, allergy gate, audit log, admin escalation, outcome ownership |
| Frontend | error mapping, risk mapping, both stores (no defaults, failure handling, payload shape) |
| Live | one manual smoke run against the real model with synthetic data (documented in the history notes) |

## 8. Migration notes (old → new)

- Removed `POST /auth/register`, `POST /auth/verify-otp`, `GET /internal/encounter-context/{id}` and the engine's old `/api/ai/*` routes.
- `GET /ai/briefs/{id}` and `GET /encounters/{id}/soap` no longer generate; the UI now calls the `POST` endpoints.
- New migration `2026_10_05_000001`: `patients.medical_history`, `patients.current_medications`, `reports.analysis_error`, `ai_briefs.risk_rationale`, `ai_briefs.red_flags`. Run `php artisan migrate`.
- Existing patients have no AI consent on file; record it from the patient profile before AI features work for them.
- Old engine modules (`agents/`, `routers/`, `services/`, `schemas/`, `core/`, root `main.py`) are superseded by `app/` and can be deleted.
