# PHASE 6: API SPECIFICATIONS & DEPENDENCIES

## REST API Overview (Laravel Port 8080)

### 1. Authentication APIs
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`

### 2. Patient Management APIs
- `GET /api/patients`
- `POST /api/patients`
- `GET /api/patients/{id}`
- `PUT /api/patients/{id}`
- `POST /api/patients/check-duplicate`

### 3. Appointment APIs
- `GET /api/appointments`
- `POST /api/appointments`
- `GET /api/appointments/{id}`
- `POST /api/appointments/{id}/cancel`
- `POST /api/appointments/{id}/complete`
- `GET /api/doctors/{id}/slots`

### 4. Encounter & Consultation APIs
- `GET /api/encounters`
- `POST /api/encounters/{id}/start`
- `POST /api/encounters/{id}/complete`
- `GET /api/ai/briefs/{encounterId}`
- `POST /api/ai/briefs/{encounterId}/regenerate`
- `GET /api/encounters/{id}/soap`
- `PUT /api/encounters/{id}/soap`
- `POST /api/encounters/{id}/sign`
- `GET /api/prescriptions?encounter_id={id}`
- `PUT /api/prescriptions/{id}`
- `POST /api/prescriptions/{id}/approve`
- `GET /api/prescriptions/{id}/pdf`

### 5. Report APIs
- `GET /api/reports`
- `POST /api/reports/upload`
- `GET /api/reports/{id}`
- `GET /api/reports/{id}/download`

## FastAPI Internal & Direct APIs (Port 8000)

### 1. Intake / Voice APIs
- `POST /ai/intake/form`
- `POST /ai/intake/voice`
- `GET /ai/intake/{encounterId}`

### 2. Analysis APIs
- `POST /ai/reports/analyze`
- `POST /ai/reports/analyze-file`
- `POST /ai/brief/generate`
- `GET /ai/brief/{encounterId}`

### 3. Internal Orchestration APIs (Triggered by Laravel)
- `POST /internal/generate-brief` (Generates doctor brief)
- `POST /internal/analyze-report` (OCR + Summary of uploaded reports)
- `POST /internal/generate-soap` (Drafts the SOAP note)
- `POST /internal/draft-prescription` (Drug interaction checking)
- `POST /internal/log-outcome` (Outcome analysis)
