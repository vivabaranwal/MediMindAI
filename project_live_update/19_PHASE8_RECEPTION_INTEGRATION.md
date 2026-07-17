# PHASE 8: FRONTEND INTEGRATION - AUTHENTICATION & RECEPTION DESK

This document details the frontend changes introduced in **Phase 8** to connect the Next.js portal layout components to the Laravel Sanctum REST API endpoints.

---

## 1. Environment & API Client Configuration

### 1.1 Local Staging Environment
Created [frontend/.env.local](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/.env.local) to point the Next.js runtime environment to the Laravel service port:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 1.2 Centralized Axios Client
Implemented [apiClient.ts](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/services/apiClient.ts) using interceptor middleware.
* Automatically resolves the active Sanctum `access_token` from `localStorage` values (`token` or `sanctum_token`).
* Injects it into every request payload using the headers format: `Authorization: Bearer <token>`.

---

## 2. Authentication Flow (Reception Login)

### 2.1 Zustand Auth Store
Created [authStore.ts](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/store/authStore.ts) containing standard token lifecycle state variables:
* **Password Login:** Authenticates against `POST /api/auth/login` using `{ email, password }`.
* **OTP Handling:** Exposes `sendOtp` (`POST /api/auth/send-otp`) and `loginWithOtp` (`POST /api/auth/login` using `{ mobile, otp }`).
* **Session Persistence:** Stores token and user profile objects securely inside `localStorage` on login, and purges all references on `logout()`.

### 2.2 UI Updates ([reception-login/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/(auth)/reception-login/page.tsx))
* Restructured login layout to toggle between **Password** (email/password) and **Secure OTP** (mobile/otp) methods.
* Connected submit hooks directly to `authStore` functions.
* Added a debug label to display dynamically returned OTP codes for developer ease during staging.
* Created a secondary **Send request to administrator** button wired directly to a success `Toast` notification.

---

## 3. Patient Intake & Queue Routing

### 3.1 Registry Submission ([register/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/reception/register/page.tsx))
* Modified submit handlers to compile standard `StorePatientRequest` properties (mapping birthdates to `date_of_birth` and calculating patient age).
* Calls `POST /api/patients` to persist the record.
* Immediately invokes `POST /api/appointments` to associate the patient with the chosen specialist doctor's consult queue on the current date, using the walk-in triage level.
* Automatically redirects to the active Queue Monitor upon successful registration.

### 3.2 Queue Monitoring & Actions ([reception/page.tsx](file:///c:/Users/Viva/Downloads/medimind-dev-plan/frontend/app/reception/page.tsx))
* Replaced static initial queues with database reads from `GET /api/appointments/queue`.
* Introduced a doctor-specific select option at the top of the monitor layout to inspect distinct consultation queues.
* Replaced static check-in triggers with active `PATCH /api/appointments/{id}/status` state updates (sending `in_consultation` status) to start consultations.
