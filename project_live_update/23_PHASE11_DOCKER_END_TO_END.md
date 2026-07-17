# Phase 11: DevOps & Infrastructure (Docker End-to-End Environment)

This document outlines the containerized dev/production environment implemented for **Phase 11 (DevOps & Infrastructure)**. All layers (Next.js frontend, Laravel PHP backend, FastAPI Python AI/ML microservice, Postgres database, Redis cache, and Qdrant vector database) are fully containerized and networked together using Docker Compose.

---

## 1. Environment Configurations
Before running the container network, ensure the following keys are populated in your local `.env` files:

### A. AI Engine Environment
- **File:** `medimind-ai-engine/.env`
- **Keys:**
  - `OPENAI_API_KEY`: Paste your real OpenAI developer API key here.
  - `INTERNAL_API_SECRET=super-secret-token` (Must match the value used by the Laravel backend to allow authorization).
  - `X_INTERNAL_SECRET=super-secret-token`

### B. Laravel Backend Environment
- **File:** `backend/.env`
- **Note:** The `docker-compose.yml` automatically overrides database connections in the `backend` container to use the PostgreSQL container `db` and Redis container `redis`.

---

## 2. Docker Files Generated

- **AI Engine (FastAPI):** [medimind-ai-engine/Dockerfile](file:///c:/Users/Viva/Downloads/medimind-dev-plan/medimind-ai-engine/Dockerfile)
  - Uses `python:3.11-slim` base, installs dependencies, exposes `8080`, and runs `uvicorn main:app --host 0.0.0.0 --port 8080`.
- **Backend (Laravel):** [backend/Dockerfile](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/Dockerfile)
  - Uses `php:8.3-cli` base, installs Postgres Client (`libpq-dev`), `zip`, `unzip`, installs `pdo_pgsql` and `redis` php extensions, installs global Composer, exposes `8000`, and runs `php artisan serve --host=0.0.0.0 --port=8000`.
- **Frontend (Next.js):** [frontend/Dockerfile](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/Dockerfile)
  - Uses `node:20-alpine` base, installs `node_modules` dependencies, exposes `3000`, and starts in local development mode using `npm run dev`.
- **Master Configurations:** [docker-compose.yml](file:///c:/Users/Viva/Downloads/medimind-dev-plan/docker-compose.yml)
  - Sets up Postgres 16 (`db`), Redis (`redis`), Qdrant (`qdrant`), and links the three main application layers (`ai-engine`, `backend`, `frontend`) together in a secure local subnet.

---

## 3. Running the Stack

To build and launch the entire multi-service container group in detached mode, run:
```bash
docker-compose up -d --build
# Or with the modern Docker CLI:
docker compose up -d --build
```

### Initial Database Setup & Migrations
Once the containers are running, run the migrations and seeds inside the Laravel backend container to populate the Postgres database:
```bash
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
```

### Checking Status & Logs
```bash
docker compose ps
docker compose logs -f
```
