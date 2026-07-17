# Phase 8: Doctor Console & Reception Desk Frontend Integration

This document outlines the changes implemented for **Phase 8 (Frontend Integration) - Part 2: Doctor Console** and the reception-desk patient report uploads. All frontend mocks have been replaced with real asynchronous API calls to the Laravel backend.

---

## 1. Core Architecture Integrations

### Axios central API Client (`apiClient.ts`)
- Centralized Axios client reads configuration from `NEXT_PUBLIC_API_URL`.
- Automatically attaches Bearer tokens (from Laravel Sanctum) from `localStorage` using a request interceptor.

### Zustand Doctor State Store (`seniorDoctorStore.ts`)
- Integrated all mock actions into real backend async endpoints:
  - `fetchDashboardData(doctorId)`: Fetches live daily appointments queue via `GET /api/appointments/queue` and active consultations via `GET /api/encounters`.
  - `loadEncounterForPatient(patientId)`: Retrieves full clinical encounter, reports list, SOAP note, prescriptions, and AI doctor briefs in a single load sequence.
  - `saveSoapDraft(encounterId, fields)`: Submits subjective/objective/assessment/plan drafts to `PUT /api/encounters/{id}/soap`.
  - `signSoapNote(encounterId)`: Submits digital signature trigger to `POST /api/encounters/{id}/sign`.
  - `savePrescriptionDraft(encounterId, medications, instructions, followupDate)`: Saves medication lists and follow-up schedules in the backend database via `POST /api/prescriptions`.
  - `approvePrescriptionApi(prescriptionId)`: Approves and seals prescriptions via `POST /api/prescriptions/{id}/approve`.
  - `completeConsultationApi(encounterId)`: Marks the encounter as completed via `POST /api/encounters/{id}/complete`.

---

## 2. Page-level Integrations

### Doctor Dashboard & Queue
- Dashboards load active consultations and work queues dynamically.
- Loading states are managed visually using a customized `Spinner` component.

### Patient Detail Page
- Triggers dynamic data load on mount.
- Renders detailed EMR timeline and clinical action points dynamically.

### Clinical SOAP Workspace
- Synchronizes edits dynamically to the backend.
- Prevents modifications and locks input fields when the SOAP note is signed and approved.

### Prescription Workspace
- Pre-populates recommended pharmacotherapy from AI analysis.
- Automatically saves draft changes (adding or removing medications) to the database.
- Approves and digitally transmits prescriptions on sign-off.

### Follow-up & Care Planner
- Connects follow-up timeframe check-ins to database prescription records.
- Verifies full EMR completion checklist (signed SOAP, signed Prescription, saved Care Plan) before allowing consultation sign-off.

### Reception Desk Patient Dossier
- Fetches patient and reports dynamically on page load.
- Connects file upload forms to submit real files (PDF/images) as `FormData` to `POST /api/reports/upload`.
- Tracks upload status using Axios progress hooks to show file transfer percentages.
