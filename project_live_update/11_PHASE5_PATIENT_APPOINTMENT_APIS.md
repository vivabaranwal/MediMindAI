# PHASE 5 & 6: PATIENT & APPOINTMENT APIS

This document details the APIs, DTOs, Services, and Controllers developed in Phase 5 and Phase 6 for the **Patient Management** and **Appointment Management** modules.

## 1. Technical Components Map

```
Request (DTO) ──> Controller ──> Service ──> Repository ──> Database
```

| Component | Target File | Description |
| :--- | :--- | :--- |
| **Patient DTOs** | `StorePatientRequest.php` & `UpdatePatientRequest.php` | Validates onboarding details and profile updates. |
| **Patient Service** | `PatientService.php` | Handles business logic (transactional user + patient records creation, duplicate checking). |
| **Patient Controller** | `PatientController.php` | RESTful mapping of index, show, store, and update actions. |
| **Appointment DTOs** | `StoreAppointmentRequest.php` & `UpdateAppointmentStatusRequest.php` | Validates appointment bookings and status changes. |
| **Appointment Service** | `AppointmentService.php` | Slot conflict checking, sequential queue token generation, and triage-level queue sorting. |
| **Appointment Controller** | `AppointmentController.php` | Endpoints for booking, custom prioritized queue fetching, status updates, completions, and cancellations. |

---

## 2. API Specifications (Base: `/api`)

All endpoints below require authentication and must include a `Bearer {token}` header.

### 2.1 Patient Management Endpoints
*   `GET /patients`
    *   **Description:** Returns all patients, with support for search.
    *   **Parameters:** `search` (string, optional - searches by code, name, or mobile).
*   `POST /patients`
    *   **Description:** Registers a new patient and creates a matching portal user account.
    *   **Body:** `StorePatientRequest` (requires `name`, `mobile`; other PII fields optional).
*   `GET /patients/{id}`
    *   **Description:** Retrieves demographic and profile details of a patient.
*   `PUT /patients/{id}`
    *   **Description:** Updates profile fields for an existing patient.

### 2.2 Appointment & Queue Endpoints
*   `POST /appointments`
    *   **Description:** Books a doctor appointment and assigns a queue token.
    *   **Body:** `StoreAppointmentRequest` (requires `patient_id`, `doctor_id`, `appointment_date`, `appointment_time`, `chief_complaint`).
*   `GET /appointments/queue`
    *   **Description:** Fetches the daily prioritized queue for a doctor.
    *   **Parameters:** `doctor_id` (required), `date` (optional, defaults to today).
    *   **Response Sorting:** Priority order `red` (critical) > `amber` (medium) > `green` (low), and then chronologically by `appointment_time`.
*   `PATCH /appointments/{id}/status`
    *   **Description:** Updates the status (e.g. `in_queue`, `in_consultation`, etc.) of a booking.
*   `POST /appointments/{id}/cancel`
    *   **Description:** Cancels an appointment.
*   `POST /appointments/{id}/complete`
    *   **Description:** Completes an appointment.

---

## 3. Business Rules Enforced

1.  **Duplicate Registrations:**
    If a mobile number already exists, `PatientService` throws a validation exception:
    `"A patient with this mobile number is already registered."`
2.  **No Double-Booking:**
    `AppointmentService` checks if a slot exists for the given doctor, date, and time. If it conflict, it throws a validation exception:
    `"This slot is already booked for the selected doctor."`
3.  **Triage Prioritization:**
    The daily queue is fetched with a custom `orderByRaw` clause prioritizing critical conditions (`red` > `amber` > `green`).
