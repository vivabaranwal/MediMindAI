# PHASE 5 & 6: ANALYTICS & REPORTING (FRS-011) & PHASE 9: ADMIN PANEL REST APIs

This document details the APIs, DTOs, Services, and Controllers developed for **Analytics & Reporting** (FRS-011) and the **Admin Panel** (Phase 9) user/role management.

---

## 1. Technical Components Map

```
Request (DTO) ──> Controller ──> Service ──> Repository ──> Database
```

| Component | Target File | Description |
| :--- | :--- | :--- |
| **Admin User DTOs** | [StoreAdminUserRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/StoreAdminUserRequest.php) & [UpdateAdminUserRequest.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Requests/UpdateAdminUserRequest.php) | Validates payload data for creating and updating clinic staff user records, ignoring duplicate checks for existing entries during updates. |
| **User Repository** | [UserRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/UserRepositoryInterface.php) & [UserRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/UserRepository.php) | Abstracts the persistence layer operations for the `users` table. |
| **Admin User Service** | [AdminUserService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/AdminUserService.php) | Handles password hashing, synchronizes Spatie roles via `syncRoles()`, and automatically initializes related `Doctor` profiles. |
| **Admin User Controller** | [AdminUserController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/AdminUserController.php) | Exposes standard RESTful API resource endpoints for managing staff users. |
| **Analytics Repository** | [AnalyticsRepositoryInterface.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/Contracts/AnalyticsRepositoryInterface.php) & [AnalyticsRepository.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Repositories/AnalyticsRepository.php) | Encapsulates complex DB aggregates (completed encounters, average wait times, no-shows, recovery trends). |
| **Analytics Service** | [AnalyticsService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/AnalyticsService.php) | Computes mathematical ratios, recovery percentages, and waiting/consultation averages. |
| **Analytics Controller** | [AnalyticsController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Api/AnalyticsController.php) | Exposes routing endpoints for doctor, clinic-wide, and treatment outcomes metrics. |

---

## 2. API Specifications (Base: `/api`)

All endpoints below require authentication.

### 2.1 Staff User Management (Admin CRUD)
*   `GET /admin/users`
    *   **Description:** Retrieves a list of all register clinic staff users.
    *   **Role Access:** `clinic_admin`, `super_admin`.
*   `POST /admin/users`
    *   **Description:** Creates a new staff user and assigns Spatie roles.
    *   **Role Access:** `clinic_admin`, `super_admin`.
*   `GET /admin/users/{id}`
    *   **Description:** Fetches details of a specific user.
    *   **Role Access:** `clinic_admin`, `super_admin`.
*   `PUT /admin/users/{id}`
    *   **Description:** Updates staff credentials, statuses, and role mappings.
    *   **Role Access:** `clinic_admin`, `super_admin`.
*   `DELETE /admin/users/{id}`
    *   **Description:** Suspends or deletes a clinic staff user.
    *   **Role Access:** `clinic_admin`, `super_admin`.

### 2.2 Analytics & Performance Metrics
*   `GET /analytics/doctor?doctor_id={id}`
    *   **Description:** Returns completions count and average consult durations.
    *   **Role Access:** `doctor` (can only query their own ID), `clinic_admin`, `super_admin`.
*   `GET /analytics/clinic`
    *   **Description:** Aggregates clinic-wide appointments, wait times, and no-shows for today.
    *   **Role Access:** `clinic_admin`, `super_admin`.
*   `GET /analytics/outcomes`
    *   **Description:** Calculates recovery rate vs. AI outcome escalation rate from patient questionnaire submissions.
    *   **Role Access:** `clinic_admin`, `super_admin`.

---

## 3. Business Rules Enforced

1.  **Strict Role Boundaries**:
    *   Only `clinic_admin` or `super_admin` can retrieve clinic-wide analytics and access staff user CRUD resources.
    *   `doctor` accounts can only access `/analytics/doctor` for their own doctor ID, and are prevented from querying other doctors.
    *   Standard `patient` and `front_desk` roles are completely restricted from accessing all admin and analytics routes.
2.  **Cascaded Doctor Profiles**:
    When creating or updating a user to the `'doctor'` role, the service automatically initiates or matches a corresponding entry in the `doctors` table, ensuring schema relationships are never broken.
3.  **Wait Time and Duration Formulas**:
    *   **Consultation Time:** Average of difference between `completed_at` and `started_at` timestamps for completed encounters.
    *   **Clinic Waiting Time:** Difference between encounter `started_at` time and the scheduled appointment start time for all check-ins today.
    *   **No-Show Rate:** Total no-shows divided by total scheduled appointments for today, returned as a percentage.
