# PHASE 5 & 6: FOLLOW-UP & OUTCOME ENGINE REST APIs

This document details the APIs, DTOs, Services, and Controllers developed in Phase 5 and Phase 6 for the **Follow-Up & Outcome Engine** (FRS-010).

---

## 1. Technical Components Map

```
Request (DTO) ──> Controller ──> Service ──> Repository ──> Database
```

| Component | Target File | Description |
| :--- | :--- | :--- |
| **Follow-up DTOs** | [StoreFollowupRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/StoreFollowupRequest.php) | Validates followup scheduling inputs (dates, mediums, patient/encounter context). |
| **Follow-up Repository** | [FollowupRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/FollowupRepositoryInterface.php) & [FollowupRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/FollowupRepository.php) | Abstracts the persistence layer operations for the `followups` table. |
| **Follow-up Service** | [FollowupService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/FollowupService.php) | Schedules patient follow-ups, binds patient/encounter/doctor ids, and defaults status to `pending`. |
| **Follow-up Controller** | [FollowupController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/FollowupController.php) | Exposes endpoints to schedule followups and search schedule logs by patient. |
| **Outcome DTOs** | [StoreOutcomeRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/StoreOutcomeRequest.php) | Validates outcomes details payload (symptom ratings, side effects, patient feedback notes). |
| **Outcome Repository** | [OutcomeRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/OutcomeRepositoryInterface.php) & [OutcomeRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/OutcomeRepository.php) | Abstracts persistence operations for the `outcomes` table. |
| **Outcome Service** | [OutcomeService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/OutcomeService.php) | Records outcome answers, updates related follow-up statuses, and runs the **Escalation Detection** algorithm. |
| **Outcome Controller** | [OutcomeController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/OutcomeController.php) | Exposes endpoints to submit outcome questionnaires and fetch logs by patient. |

---

## 2. API Specifications (Base: `/api`)

All endpoints below require authentication.

### 2.1 Follow-up Scheduling Endpoints
*   `POST /followups`
    *   **Description:** Schedules a new patient digital follow-up questionnaire.
    *   **Role Access:** `doctor`, `front_desk`, `super_admin`.
*   `GET /followups?patient_id={id}`
    *   **Description:** Lists scheduled followups by patient.
    *   **Role Access:** `doctor`, `front_desk`, `super_admin`.

### 2.2 Outcome Logging Endpoints
*   `POST /outcomes`
    *   **Description:** Patient submits a treatment outcome questionnaire response.
    *   **Role Access:** `patient`, `doctor`, `super_admin`.
*   `GET /outcomes?patient_id={id}`
    *   **Description:** Retrieves historical patient outcomes records.
    *   **Role Access:** `patient`, `doctor`, `super_admin`.

---

## 3. Business Rules Enforced

1.  **Follow-up Progression**:
    Submitting an outcome feedback linked to a `followup_id` automatically transitions the followup status from `pending` to `responded`, logging `responded_at` and preserving the submitted response data inside the `responses` JSON structure.
2.  **Escalation Detection Algorithm**:
    The service parses the submitted outcome:
    *   If `treatment_worked === 'worsened'`.
    *   If notes (`patient_notes`) contains keywords like `"severe"` or `"worsened"`.
    *   If side effects (`side_effects` array) contains comments with `"severe"` or `"worsened"`.
    If matched, it flags `ai_outcome_label = 'escalated'` and automatically upgrades the associated appointment's `triage_level` to `'red'`, alerting clinical staff immediately.
3.  **Transactional Integrity**:
    All database operations (creating outcome, updating followup status, and performing triage level modifications) run within database transactions ensuring absolute EMR integrity.
