# PHASE 3: AUTHENTICATION & AUTHORIZATION IMPLEMENTATION

This document details the code implementations completed for Phase 3 (Authentication and RBAC) in the Laravel backend.

## 1. User Model & Attribute Casts
*   **File:** [User.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Models/User.php)
*   **Implementation:**
    *   Added attributes: `mobile`, `role`, `status`, `mobile_verified_at` to `#[Fillable]`.
    *   Added Spatie Permission `HasRoles` trait.
    *   Added Laravel Sanctum `HasApiTokens` trait.
    *   Configured casting of `mobile_verified_at` to `datetime`.

## 2. OTP Verification Service (Redis integration)
*   **File:** [OtpService.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Services/OtpService.php)
*   **Implementation:**
    *   Saves OTP code to Redis with a `otp:{mobile}` key pattern and a 5-minute TTL.
    *   In sandbox/local mode, generates a static `'123456'` code for frontend testing convenience.
    *   Verifies incoming OTPs and flushes keys from Redis upon success.

## 3. Middleware Configurations
*   **File:** [EnsureVerifiedMobile.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Middleware/EnsureVerifiedMobile.php)
    *   Checks if authenticated users have completed mobile verification before accessing core features.
*   **File:** [AuditLogMiddleware.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Middleware/AuditLogMiddleware.php)
    *   Automatically logs all API write actions (POST, PUT, PATCH, DELETE) for authenticated users in the `audit_logs` table (excluding sensitive fields like `password`, `otp`, etc.).
*   **File:** [app.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/bootstrap/app.php)
    *   Registered `verified.mobile` and `audit` middleware aliases.
    *   Appended `AuditLogMiddleware` globally to the `api` middleware group.

## 4. Auth & OTP Controllers
*   **File:** [OtpController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Auth/OtpController.php)
    *   `POST /api/auth/send-otp` — requests a verification OTP.
    *   `POST /api/auth/verify-otp` — checks OTP validity.
*   **File:** [LoginController.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/app/Http/Controllers/Auth/LoginController.php)
    *   `POST /api/auth/login` — supports password-based login (for doctors and admins) and OTP-based login (for patients).
    *   `POST /api/auth/register` — registers new users and assigns Spatie roles.
    *   `POST /api/auth/logout` — revokes active Sanctum API tokens.

## 5. Seeders & Role Scoping
*   **File:** [RolesAndPermissionsSeeder.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/database/seeders/RolesAndPermissionsSeeder.php)
    *   Explicitly seeds permissions and roles across both `'web'` and `'api'` guards to support token authentication (Sanctum API) and session authentication (Filament Admin Panel).
*   **File:** [AdminUserSeeder.php](file:///c:/Users/Viva/Downloads/medimind-dev-plan/backend/database/seeders/AdminUserSeeder.php)
    *   Creates the default Super Admin user (`admin@medimind.ai` with password `password123`) and assigns the `super_admin` role.
