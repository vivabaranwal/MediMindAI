# PHASE 5 & 6: REPORT OCR & AI DOCTOR BRIEFS APIs

This document details the APIs, DTOs, Services, and Controllers developed in Phase 5 and Phase 6 for the **Report & Image Reader** and **AI Physician Doctor Briefs** modules.

---

## 1. Technical Components Map

```
Request (DTO) ──> Controller ──> Service ──> Repository ──> Database
```

| Component | Target File | Description |
| :--- | :--- | :--- |
| **Report DTOs** | [StoreReportRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/StoreReportRequest.php) | Validates uploaded report documents (restricts formats to `pdf`, `jpg`, `jpeg`, `png`, `tiff` and limits size to `20MB`). |
| **Report Repository** | [ReportRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/ReportRepositoryInterface.php) & [ReportRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/ReportRepository.php) | Handles DB persistence and queries for EMR medical documents. |
| **Report Service** | [ReportService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/ReportService.php) | Uploads document files to storage using the `Storage` facade, records metadata in the database, and flags default status as `pending_analysis`. |
| **Report Controller** | [ReportController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/ReportController.php) | Exposes REST endpoints to upload files, retrieve specific records, download raw files, and search by patient. |
| **AI Doctor Brief Repository** | [AiBriefRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/AiBriefRepositoryInterface.php) & [AiBriefRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/AiBriefRepository.php) | Handles persistence for generated physician summaries. |
| **AI Doctor Brief Service** | [AiBriefService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/AiBriefService.php) | Handles fetching briefs, and maps regeneration requests to external FastAPI services via the `AIGatewayService`. |
| **AI Doctor Brief Controller** | [AiBriefController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/AiBriefController.php) | Exposes endpoints to show AI briefs by encounter and trigger AI summaries regenerations. |

---

## 2. API Specifications (Base: `/api`)

All endpoints below require authentication.

### 2.1 Medical Reports Endpoints
*   `POST /reports/upload`
    *   **Description:** Uploads a document (`file`, `patient_id`, `encounter_id`, `report_type`).
    *   **Role Access:** `front_desk`, `doctor`, `clinic_admin`, `super_admin`.
*   `GET /reports?patient_id={id}`
    *   **Description:** Lists all reports linked to a patient.
    *   **Role Access:** `front_desk`, `doctor`, `clinic_admin`, `super_admin`.
*   `GET /reports/{id}`
    *   **Description:** Retrieves report OCR findings and analysis summary.
    *   **Role Access:** `front_desk`, `doctor`, `clinic_admin`, `super_admin`.
*   `GET /reports/{id}/download`
    *   **Description:** Downloads the raw binary document file.
    *   **Role Access:** `front_desk`, `doctor`, `clinic_admin`, `super_admin`.

### 2.2 AI Doctor Briefs Endpoints
*   `GET /ai/briefs/{encounterId}`
    *   **Description:** Retrieves the generated AI Doctor Brief for an encounter.
    *   **Role Access:** `doctor`, `super_admin`.
*   `POST /ai/briefs/{encounterId}/regenerate`
    *   **Description:** Triggers background FastAPI regeneration.
    *   **Role Access:** `doctor`, `super_admin`.

---

## 3. Business Rules Enforced

1.  **Strict File Verification**:
    Only `pdf`, `jpg`, `jpeg`, `png`, and `tiff` files under `20MB` (`20480 KB`) are accepted. Any other extensions or larger sizes trigger `422 Unprocessable Content`.
2.  **Pending Analysis Default**:
    All uploaded documents initially write with `status = 'pending_analysis'` and `ai_processed = false`, waiting for external queue workers to execute Vision AI extraction tasks.
3.  **Role Access Control**:
    AI briefs are restricted to doctors and super administrators, while reports uploading/indexing is allowed for front desk and clinic administrators as well.
