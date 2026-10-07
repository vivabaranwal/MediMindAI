# MediMind AI

Clinic workflow platform for an ENT practice. It moves a patient through **reception → junior doctor intake → senior doctor review → SOAP note → prescription → follow-up**, with AI assistance at each clinical step.

The AI assists; it never decides. Every AI output is a labelled draft for a licensed doctor to review.

| Role | Portal | What they do |
|---|---|---|
| Reception | `/reception` | Register patients (allergies, consents), manage the queue, upload reports |
| Junior doctor | `/junior-doctor` | AI-guided intake questions, vitals, AI case summary, hand off to a senior doctor |
| Senior doctor | `/senior-doctor` | Review brief, report findings and suggestions, ask questions about the record, SOAP, prescription, follow-up |
| Admin | `/admin` | Staff management, analytics, system overview, audit trail |

## Architecture

```
Browser (Next.js)
   │  HTTPS, Sanctum bearer token
   ▼
Laravel API ─────────── PostgreSQL        system of record: auth, roles, patients, encounters, SOAP,
   │  │                                    prescriptions, reports, consents, audit log
   │  └─ queue worker ──┐
   │ private network,   │  report analysis jobs (OCR + AI) run in the background
   │ shared secret      ▼
   └──────────────► AI Engine (FastAPI, private)  ── OpenAI (chat + embeddings)
                         │
                         ├─ Tesseract OCR (local)  scans never leave the container
                         └─ Qdrant                 searchable chunks of each patient's reports
```

Key rules:
- **Laravel is the only public API.** The browser never talks to the AI engine; the engine, database and vector store are not published by Docker.
- **Laravel owns all data.** It sends the engine exactly the context each call needs; the engine keeps nothing except the vector index.
- **AI needs patient consent** (`ai_assistance`, recorded at registration). Without it no patient data leaves Laravel. Drug-allergy checks do **not** depend on consent or on the engine being up.
- **No mock data anywhere.** If the AI is unavailable the UI shows an error with a retry; nothing is invented and nothing is saved.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the pipelines and data flows, and [docs/SECURITY.md](docs/SECURITY.md) for the security model.

## Repository layout

```
backend/              Laravel 13 API (PHP 8.3): controllers → services → repositories
  app/Services/Ai/    context builder, consent, assistant (chat/intake/suggestions), report analysis
  app/Services/Clinical/DrugAllergyChecker.php   deterministic allergy rules
medimind-ai-engine/   FastAPI engine: pipelines, prompts, OCR, retrieval, safety rules (see its README)
frontend/             Next.js 14 (App Router, Zustand, Tailwind)
docs/                 architecture and security documentation
project_live_update/  historical development notes
docker-compose.yml    full stack
.env.example          compose configuration
```

## Run with Docker

Requires Docker. Only ports 3000 (web) and 8000 (API) are published.

```bash
cp .env.example .env      # fill APP_KEY, POSTGRES_PASSWORD, INTERNAL_API_SECRET, OPENAI_API_KEY
docker compose up -d --build
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force   # first admin; set SEED_ADMIN_PASSWORD in .env first
```

Open http://localhost:3000. Compose refuses to start if a required secret is missing.

`OTP_SMS_DRIVER=log` writes OTP codes to the Laravel log and only works with `APP_ENV=local`. Production needs a real SMS provider (implement `App\Contracts\SmsGateway`).

## Run locally without Docker

```bash
# AI engine (needs Qdrant on :6333 and Tesseract with eng+hin language data for OCR)
cd medimind-ai-engine && python -m venv venv && venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # INTERNAL_API_SECRET (24+ chars) and OPENAI_API_KEY
uvicorn app.main:app --port 8080

# Backend (PHP 8.3+)
cd backend && composer install && cp .env.example .env && php artisan key:generate
# set FASTAPI_URL=http://localhost:8080 and FASTAPI_INTERNAL_SECRET=<same secret as the engine>
php artisan migrate --seed && php artisan serve --port 8000
php artisan queue:work          # report analysis runs here

# Frontend
cd frontend && npm install && npm run dev
```

## Tests

| Suite | Command | Needs |
|---|---|---|
| Backend (PHPUnit) | `cd backend && php vendor/bin/phpunit` | PHP 8.3 (sqlite in memory) |
| AI engine (pytest) | `cd medimind-ai-engine && pytest` | nothing: no network, no API key |
| Frontend (Vitest) | `cd frontend && npm test` | nothing |
| Frontend static | `cd frontend && npx tsc --noEmit && npm run lint && npm run build` | |

The engine and backend tests replace only the outside-world boundaries (LLM, embeddings, OCR, the engine's HTTP API). Real OCR needs Tesseract and is exercised in the Docker image.

## Key behaviours worth knowing

- **Red-flag triage floor.** Airway and neck red flags (and mastoid signs, sudden hearing loss, etc.) raise risk in code. The model can raise risk further but never lower it below the floor. Negations ("no shortness of breath") are respected.
- **Report pipeline.** Upload → queue → validate by file content → PDF text layer, or OCR for scans → structured findings (lab flags re-checked against printed reference ranges) → indexed per patient. A name on the report that doesn't match the patient raises a warning.
- **Grounded chat.** Answers must cite the patient chart or a report excerpt; uncited answers are replaced by "not found in the record". Retrieval is filtered by patient and cannot cross patients.
- **Prescription safety.** Every medicine, including free-text ones, is checked against the patient's recorded allergies. Critical conflicts block approval unless the prescribing doctor explicitly overrides.

## Known limitations

- Report uploads are stored on the application disk; move to S3/MinIO for production scale.
- The browser keeps the Sanctum token in `localStorage`; switching to Sanctum's cookie (SPA) mode removes that XSS exposure.
- The backend image uses `artisan serve`; put php-fpm + nginx in front for production.
- Voice dictation, similar-case matching and cohort outcome projections from the original plan are not implemented (the placeholder UI that faked them was removed).
- Patient fields are stored unencrypted at the application level; enable database/volume encryption for production.
- The formulary list in the prescription builder is a static convenience list (`frontend/lib/formulary.ts`).
- Any doctor can open any patient in clinic (no per-doctor assignment checks yet).

## Further reading

- [AI engine README](medimind-ai-engine/README.md)
- [Architecture & data flows](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
