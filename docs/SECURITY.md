# Security model

## Trust boundaries

```
Internet ─► Next.js ─► Laravel API ─► private network: PostgreSQL, Qdrant, AI engine ─► OpenAI
```
Only the web app and the Laravel API are published. Everything behind Laravel is reachable only from inside the Docker network.

## What was fixed (from the initial audit)

| Issue | Fix |
|---|---|
| Anyone could register as `clinic_admin` (`POST /auth/register`) | Route removed. Staff are created by admins; only a super admin can create or modify a super admin |
| Universal OTP `123456` | Real OTP: random, hashed, 5 min expiry, 5 attempts, single use, resend cooldown, no echo in the response; OTP login limited to patient/front-desk roles; generic errors (no number enumeration); the log "SMS" driver refuses to run outside local/testing |
| `super-secret-token` hardcoded in code, compose and the browser bundle | Removed everywhere. The shared secret has no default; the engine refuses weak or placeholder values and refuses to start without it; the browser never calls the engine; the engine compares the secret in constant time (`hmac.compare_digest`) and Laravel has no inbound internal routes at all |
| AI engine, Postgres, Redis, Qdrant published on the host | Not published. Unused Redis removed |
| Patient role could list every patient and read any report | Clinic-record routes require a staff role; patients may only act on their own outcomes; an outcome's encounter must belong to its patient |
| Engine → Laravel callback endpoint exposed patient context | Route deleted; Laravel pushes context instead |
| Secrets baked into Docker images (`COPY . .` with `.env`) | `.dockerignore` for all three images; backend runs as `www-data`, engine as a non-root user |
| Audit log wrote nothing useful and checked the wrong guard | Fixed: records user (via the request's guard), action, resource and **field names only** |
| PHI in logs (`print` of complaints, full assessment payload logged) | Removed; engine logs are content-free and tested |
| Default passwords (`password123`) in seeders | Required via env outside local/testing |
| Login pages: junior login accepted any credentials then logged in with a hardcoded password; senior login prefilled credentials | Real email+password sign-in for every portal, role enforced client-side and server-side, no prefilled values |
| Fabricated clinical data (default vitals, fixed diagnosis, fake alerts, fake reports and demographics) | Removed; absent data is shown as absent |
| Allergy check bypassed for custom medicines; approval had no safety gate; any doctor could approve another's prescription | One server-side check for every medicine; critical conflicts block approval unless explicitly overridden; only the prescribing doctor can approve |
| Allergies could not be recorded at registration | Captured at registration and editable; they feed the safety check |

## AI-specific controls

- **Consent:** `ai_assistance` consent is required before any patient data is sent to the AI engine. The latest decision wins; it can be withdrawn.
- **Prompt injection:** document and case text is delimited and declared to be data; outputs are constrained by strict JSON schemas; chat answers must cite a provided source and invalid citations are dropped; clinical decisions are never taken from model output alone (risk floors and allergy rules are code).
- **No cross-patient leakage:** retrieval is filtered by `patient_id`; tested.
- **Data minimisation to the provider:** only the fields needed for each task are sent. Scans are OCR'd locally; only extracted text goes to the model.
- **Deletion:** deleting a report removes its search-index entries first and is refused if the engine cannot confirm.
- **Fail closed:** missing/placeholder secrets stop the engine; a misconfigured Laravel refuses AI calls with 503.

## Rotating secrets

| Secret | How |
|---|---|
| OpenAI key | Revoke at platform.openai.com → API keys, create a new one, update `.env` (`OPENAI_API_KEY`), `docker compose up -d ai-engine` |
| Shared Laravel↔engine secret | `python -c "import secrets; print(secrets.token_urlsafe(32))"` → set `INTERNAL_API_SECRET` (compose) or `FASTAPI_INTERNAL_SECRET` + engine `INTERNAL_API_SECRET` (local) → restart both |
| `APP_KEY` | Rotating invalidates sessions/encrypted values; follow Laravel's key-rotation guidance |
| Database password | `ALTER USER … PASSWORD …` in Postgres, then update `.env` |

Local note: the existing `postgres_data_fresh` database was created with user `user` / password `password`. It is no longer published, but change it (`ALTER USER "user" PASSWORD '…'`) and update `POSTGRES_PASSWORD` in `.env`.

## Residual risks and recommendations

1. **Bearer token in `localStorage`** is readable by any XSS. Move to Sanctum cookie mode for the SPA.
2. **PHI at rest** (names, mobile, address) is plaintext in the database despite schema comments saying "encrypted". Use disk/volume encryption or Eloquent encrypted casts (note: breaks `LIKE` search).
3. **No per-doctor access scoping**: any doctor can open any patient. Add policies tied to assignment if the clinic needs minimum-necessary access.
4. **File storage** is local disk; use object storage with server-side encryption and signed URLs. No antivirus scan is run on uploads (content-type sniffing and size/page limits only).
5. **`artisan serve` / dev server** is not hardened; deploy behind php-fpm + nginx with TLS.
6. **Rate limits** exist on auth and AI endpoints; add edge limits (WAF/reverse proxy) before exposing publicly.
7. **Third-party processing:** OpenAI receives clinical text. Confirm the data-processing agreement and region requirements (India DPDP) before production use.
8. **Dependency hygiene:** `npm audit` reports advisories in the existing frontend toolchain; review before upgrading (some fixes are breaking).
