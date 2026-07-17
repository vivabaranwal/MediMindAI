# Phase 8 - Part 4: Junior Doctor Triage & Handoff Integration

This document outlines the changes implemented for **Phase 8 (Frontend Integration) - Part 4: Junior Doctor Integration**. The daily consultation workflows have been wired up to support a two-tier clinical triage path: Reception ➔ Junior Doctor ➔ Senior Doctor.

---

## 1. Status Mappings & Business Rules
Since the backend utilizes a strict validation list for appointment statuses (`booked`, `confirmed`, `in_queue`, `in_consultation`, `completed`, `cancelled`, `no_show`), we mapped the logical states as follows:
- **Scheduled (Fresh from Reception):** Represented by the `'booked'` status in the database.
- **Triaged (Prepped by Junior Doctor):** Represented by the `'in_queue'` status in the database.
- **In Assessment:** Represented locally in the UI when the Junior Doctor is currently entering vitals or answering screening questions.

---

## 2. Integrated Components & Files

### A. Central state update (`juniorDoctorStore.ts`)
- **File:** [juniorDoctorStore.ts](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/store/juniorDoctorStore.ts)
- **Changes:**
  - Added `fetchQueue(doctorId)` to make an asynchronous `GET /api/appointments/queue` call and map appointments to the frontend `Patient` layout.
  - Configured status checks: maps `'booked'` to `"Waiting"`, `'in_consultation'` to `"In Assessment"`, and `'in_queue'` to `"Completed"`.
  - Updated `sendToSenior(patientId, doctorId)` to perform a secure `PATCH /api/appointments/{id}/status` request with `{ status: 'in_queue' }` to promote the patient to the Senior Doctor's queue.

### B. Junior Doctor Dashboards & Queue Pages
- **Queue Page:** [junior-doctor/queue/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/junior-doctor/queue/page.tsx)
  - Fetches the live patient list on mount using the authenticated doctor's profile.
  - Filters active patient list to ONLY show booked (`status === 'booked'`) appointments fresh from Reception.
- **Dashboard Page:** [junior-doctor/dashboard/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/junior-doctor/dashboard/page.tsx)
  - Connects page statistics (Waiting Area, In Assessment, Specialist Handoffs) to update dynamically based on the backend API.

### C. Clinical Handoff Redirect
- **Handoff Summary Page:** [junior-doctor/patient/[id]/summary/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/junior-doctor/patient/[id]/summary/page.tsx)
  - Configured `handleSendToSenior` to make the async `sendToSenior` API request.
  - Redirects the resident doctor back to their active patient queue page (`/junior-doctor/queue`) upon successful database transition.

### D. Senior Doctor Queue Filter
- **Specialist Store:** [seniorDoctorStore.ts](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/store/seniorDoctorStore.ts)
  - Modified `fetchDashboardData` to filter out any appointments in `booked` status.
  - Enforces that the Senior Doctor only sees prepped and triaged patients (status `in_queue`, `in_consultation`, or `completed`).
