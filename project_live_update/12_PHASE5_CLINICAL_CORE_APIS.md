# PHASE 5 & 6: CLINICAL CORE REST APIs

This document details the APIs, DTOs, Services, and Controllers developed in Phase 5 and Phase 6 for the **Clinical Core** module: **Encounters**, **SOAP Notes**, and **Prescriptions**.

---

## 1. Technical Components Map

```
Request (DTO) ──> Controller ──> Service ──> Repository ──> Database
```

| Component | Target File | Description |
| :--- | :--- | :--- |
| **Encounter Service** | [EncounterService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/EncounterService.php) | Manages active encounter listings and handles clinical logic for marking encounters as completed. |
| **Encounter Controller** | [EncounterController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/EncounterController.php) | Exposes endpoints to index active encounters, show details, and complete consultations. |
| **SOAP Note DTOs** | [UpdateSoapNoteRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/UpdateSoapNoteRequest.php) & [SignSoapNoteRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/SignSoapNoteRequest.php) | Validates payload structures for draft editing and signature actions. |
| **SOAP Note Repository** | [SoapNoteRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/SoapNoteRepositoryInterface.php) & [SoapNoteRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/SoapNoteRepository.php) | Abstracts the persistence layer operations for the `soap_notes` table. |
| **SOAP Note Service** | [SoapNoteService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/SoapNoteService.php) | Enforces draft validation, immutability rules, and digital signature states. |
| **SOAP Note Controller** | [SoapNoteController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/SoapNoteController.php) | RESTful mapping of GET draft, PUT updates, and POST signing. |
| **Prescription DTOs** | [StorePrescriptionRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/StorePrescriptionRequest.php) & [ApprovePrescriptionRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/ApprovePrescriptionRequest.php) | Validates medication details array, instructions, and followup timings. |
| **Prescription Repository** | [PrescriptionRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/PrescriptionRepositoryInterface.php) & [PrescriptionRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/PrescriptionRepository.php) | Abstracts persistence layer operations for the `prescriptions` table. |
| **Prescription Service** | [PrescriptionService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/PrescriptionService.php) | Handles medicines array storage, validation against duplicate medication inputs, and approval locks. |
| **Prescription Controller** | [PrescriptionController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/PrescriptionController.php) | Endpoints to retrieve active prescriptions, create/save drafts, and issue doctor approvals. |

---

## 2. API Specifications (Base: `/api`)

All endpoints below require authentication and restrict access to the `doctor` or `super_admin` roles.

### 2.1 Encounter Endpoints
*   `GET /encounters`
    *   **Description:** Returns active (non-completed) encounters for the authenticated doctor.
*   `GET /encounters/{id}`
    *   **Description:** Retrieves full demographic, EMR, and clinical details for a single encounter.
*   `POST /encounters/{id}/complete`
    *   **Description:** Transitions the encounter state to `completed`. Requires a signed SOAP note.

### 2.2 SOAP Note Endpoints
*   `GET /encounters/{id}/soap`
    *   **Description:** Retrieves the current SOAP Note draft or finalized document for the encounter.
*   `PUT /encounters/{id}/soap`
    *   **Description:** Saves SOAP Note text updates (`subjective`, `objective`, `assessment`, `plan`).
*   `POST /encounters/{id}/sign`
    *   **Description:** Doctor signs the SOAP Note. Once signed, the note becomes immutable.

### 2.3 Prescription Endpoints
*   `GET /prescriptions?encounter_id={id}`
    *   **Description:** Retrieves the prescription draft or approved order for the given encounter.
*   `POST /prescriptions`
    *   **Description:** Saves a new draft prescription (or updates existing draft). Validates structured medications.
*   `POST /prescriptions/{id}/approve`
    *   **Description:** Approves the prescription and locks it. Once approved, the prescription becomes immutable.

---

## 3. Business Rules Enforced

1.  **Immutability Policy**:
    *   If `doctor_signed === true` on a SOAP Note, any PUT request throws a validation error: `"A signed SOAP note cannot be modified."`
    *   If `doctor_approved === true` on a Prescription, any POST request saving new draft edits throws a validation error: `"An approved prescription cannot be modified."`
2.  **Encounter Completion Prerequisite**:
    An encounter completion (`POST /api/encounters/{id}/complete`) will check for the existence of a SOAP note. If the SOAP note is missing or is not signed (`doctor_signed === false`), a validation error is thrown: `"Encounter completion requires a signed SOAP note."`
3.  **Medication Deduplication**:
    The system parses the prescription medicines list to check for same-named (case-insensitive) medications. If duplicates are found, it triggers validation failure: `"Duplicate medication detected: [name]"`.
4.  **Transaction Integrity**:
    When an encounter is completed, database transactions ensure that the encounter status is marked `completed` (with `completed_at` timestamp), and the matching appointment status is updated to `completed` in a single query transaction.
