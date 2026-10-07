# 24. Architecture rebuild (October 2026)

A full audit of the project followed by a rebuild of the AI layer, the document pipeline and the security model. The earlier notes in this folder describe how the project was first built; the current design is in `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.

## Why

The audit found that the AI features were disconnected demos and that much of the UI was fabricated:

- Report uploads were never analysed (nothing called the analysis endpoint; payload shapes did not even match; the AI container could not read Laravel's files; no OCR).
- The vector store was in memory and always empty, so "RAG chat" was only the flattened encounter text. The browser called the AI engine directly with a hardcoded secret, and if that failed (no CORS) a local regex bot pretended to be the AI.
- Anyone could register as an admin; a universal OTP `123456` worked for every account; the junior-doctor login accepted any credentials.
- The senior review screen showed a fixed "Acute Otitis Media, 92%" for every patient, default vitals, fake "similar cases", invented alerts about named patients, and fake report files, demographics and audit logs.
- LLM failures were returned as HTTP 200 with the error text, then stored as the brief or SOAP note.

## What changed

1. **AI engine rewritten** (`medimind-ai-engine/app`): typed errors (never 200-with-error), strict structured output, versioned prompts, request ids, content-free logs, deterministic red-flag floor, lab-flag arithmetic, grounded chat with citations, report ingest (PDF text layer, Tesseract OCR fallback, chunking, embeddings, per-patient Qdrant index). LangGraph kept for the ingest and chat flows.
2. **Laravel integration**: one gateway, one context builder shared by brief/SOAP/suggestions/chat, AI-consent enforcement, background report analysis with retry, explicit generate endpoints (GET never generates), no stored fallbacks.
3. **Security**: see `docs/SECURITY.md`. Notably registration, OTP, shared secret, exposed ports, role scoping, audit log, Docker secrets, prescription safety gate.
4. **Frontend**: every mock service removed; real intake questioning and summaries, real doctor list, real search, real consent/allergy capture, report status with polling, honest error states, grounded chat, server-side prescription safety.
5. **Infrastructure and docs**: compose with no published internal ports and no default secrets, production frontend build, `.dockerignore`, new README and docs.

## Verification

| Check | Result |
|---|---|
| Backend PHPUnit | 99 tests passing (baseline before changes: 30 of 32; the 2 failures were real contract bugs and are fixed) |
| Engine pytest | 64 passing, offline |
| Frontend Vitest | 26 passing; `tsc`, ESLint and `next build` clean |
| Live smoke (real OpenAI, synthetic data) | brief, intake questions, report ingest (Hb 9.1 → low), cited chat and cross-patient isolation all worked. It found a gap (swelling behind the ear was not treated as a mastoid red flag); fixed and covered by tests |
| Not verified here | Docker image builds and the full compose stack (Docker daemon was not running); real Tesseract OCR (not installed on this machine) |

## Follow-ups

- Delete the superseded engine modules: `medimind-ai-engine/agents`, `routers`, `services`, `schemas`, `core`, `main.py`, `tests/test_rag_agents.py`.
- Rotate the local DB password (still `password` for the existing `postgres_data_fresh` volume).
- Real SMS provider for OTP; object storage for reports; php-fpm/nginx for production.
- Planned but not built: voice intake (Whisper), similar-case matching, cohort outcome projections.
