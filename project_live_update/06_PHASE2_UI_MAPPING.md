# PHASE 2: UI TO MODULE MAPPING

This document maps the Next.js pages to the required backend API endpoints, database tables, and user roles.

## Page Implementation Matrix

### 1. Authentication Pages

| Page Name | Route | API Endpoints Required | Database Tables | User Roles |
|---|---|---|---|---|
| **Login** | `/login` | `POST /api/auth/login` | `users`, `roles` | public |
| **Registration**| `/register` | `POST /api/auth/register`, `POST /api/auth/send-otp` | `users`, `patients` | public |

### 2. Front Desk Portal

| Page Name | Route | API Endpoints Required | Database Tables | User Roles |
|---|---|---|---|---|
| **Dashboard** | `/frontdesk/dashboard` | `GET /api/dashboard/stats` | `appointments`, `patients` | `front_desk` |
| **Registration** | `/frontdesk/register` | `POST /api/patients` | `patients`, `users`, `patient_consents` | `front_desk` |
| **Queue** | `/frontdesk/queue` | `GET /api/appointments` | `appointments`, `doctors`, `encounters` | `front_desk` |

### 3. Patient Portal

| Page Name | Route | API Endpoints Required | Database Tables | User Roles |
|---|---|---|---|---|
| **Dashboard** | `/patient/dashboard` | `GET /api/appointments`, `GET /api/reports` | `appointments`, `reports` | `patient` |
| **Appointments** | `/patient/appointments` | `GET /api/appointments` | `appointments` | `patient` |
| **Book Appt** | `/patient/appointments/book` | `GET /api/doctors/*/slots`, `POST /api/appointments` | `doctors`, `appointments` | `patient` |
| **Reports** | `/patient/reports` | `GET /api/reports` | `reports` | `patient` |
| **Upload Report**| `/patient/reports/upload` | `POST /api/reports/upload` | `reports` | `patient` |

### 4. Doctor Console

| Page Name | Route | API Endpoints Required | Database Tables | User Roles |
|---|---|---|---|---|
| **Dashboard** | `/doctor/dashboard` | `GET /api/dashboard/stats` | `appointments`, `encounters` | `doctor` |
| **Queue** | `/doctor/queue` | `GET /api/appointments` | `appointments` | `doctor` |
| **Consultation** | `/doctor/consultation/[encounterId]` | Multiple APIs (see below) | `encounters`, `patients`, `reports` | `doctor` |
| ↳ **AI Brief Panel** | (Component) | `GET /api/ai/briefs/{encounterId}` | `ai_briefs`, `encounters` | `doctor` |
| ↳ **Reports Tab** | (Component) | `GET /api/reports?patient_id={id}` | `reports` | `doctor` |
| ↳ **SOAP Tab** | (Component) | `GET /api/encounters/{id}/soap`, `PUT /api/encounters/{id}/soap`, `POST /api/encounters/{id}/sign` | `soap_notes`, `encounters` | `doctor` |
| ↳ **Prescription Tab** | (Component) | `GET /api/prescriptions?encounter_id={id}`, `POST /api/prescriptions/{id}/approve` | `prescriptions`, `encounters` | `doctor` |

### 5. Admin Panel (Filament)

| Page Name | Route | API Endpoints Required | Database Tables | User Roles |
|---|---|---|---|---|
| **Dashboard** | `/admin` | N/A (Internal Filament Logic) | Multiple | `super_admin`, `clinic_admin` |
| **User Mgmt** | `/admin/users` | N/A (Internal Filament Logic) | `users`, `roles`, `permissions` | `super_admin`, `clinic_admin` |
| **Patient Mgmt**| `/admin/patients` | N/A (Internal Filament Logic) | `patients`, `consents` | `super_admin`, `clinic_admin` |
| **Reports** | `/admin/reports` | N/A (Internal Filament Logic) | `reports` | `super_admin`, `clinic_admin` |
| **Logs** | `/admin/audit-logs` | N/A (Internal Filament Logic) | `audit_logs` | `super_admin`, `clinic_admin` |
