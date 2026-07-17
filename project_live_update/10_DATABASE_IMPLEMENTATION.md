# PHASE 4: DATABASE SCHEMA IMPLEMENTATION

This document details the database schema migration files created for the MediMind AI Primary Database (PostgreSQL).

## 1. Migrations Reference List

| Migration File | Target Table | Description |
| :--- | :--- | :--- |
| `0001_01_01_000000_create_users_table.php` | `users` | Modified default migration to include `mobile`, `role`, `status`, and `mobile_verified_at`. |
| `2026_06_24_060909_create_personal_access_tokens_table.php` | `personal_access_tokens` | Personal API token mapping for Sanctum. |
| `2026_06_24_060918_create_permission_tables.php` | Spatie RBAC tables | Spatie package tables: `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions`. |
| `2026_06_24_061015_create_audit_logs_table.php` | `audit_logs` | Immutable append-only audit trail logging user actions. |
| `2026_06_24_061344_create_patients_table.php` | `patients` | Holds patient profiles with support for encrypted PII and ABHA ID. |
| `2026_06_24_061345_create_patient_consents_table.php` | `patient_consents` | Compliance consent capture for data usage, AI assistants, and follow-ups. |
| `2026_06_24_061346_create_doctors_table.php` | `doctors` | Holds registration numbers, specialized packages, fee information, and availability days. |
| `2026_06_24_061347_create_appointments_table.php` | `appointments` | Bookings, status tracks, cancelled info, and token tokens for Receptionist queue. |
| `2026_06_24_061348_create_encounters_table.php` | `encounters` | Binds appointments, patients, and doctors, holding active consultation state. |
| `2026_06_24_061348_create_symptoms_table.php` | `symptoms` | JSONB symptoms list, transcription logs, and red-flag levels. |
| `2026_06_24_061349_create_ai_briefs_table.php` | `ai_briefs` | LLM-generated doctor brief summaries, risk ratings, and suggested questions. |
| `2026_06_24_061350_create_reports_table.php` | `reports` | Uploaded PDFs (MinIO paths), types, and OCR-extracted summaries. |
| `2026_06_24_061351_create_diagnoses_table.php` | `diagnoses` | Selection of ICD-10/11 diagnoses, differential vs primary indicator, and AI confidence. |
| `2026_06_24_061352_create_prescriptions_table.php` | `prescriptions` | JSONB medicines list, approved flags, and generated PDF storage locations. |
| `2026_06_24_061353_create_soap_notes_table.php` | `soap_notes` | Subjective, Objective, Assessment, Plan fields with digital signature support. |
| `2026_06_24_061354_create_surgeries_table.php` | `surgeries` | Recommended and scheduled surgeries, types, ICD codes, and pre/post-operative notes. |
| `2026_06_24_061355_create_followups_table.php` | `followups` | Follow-up schedules, WhatsApp questionnaire strings, and response logs. |
| `2026_06_24_061356_create_outcomes_table.php` | `outcomes` | Logs treatment efficacy markers, side effects, and learning pipeline states. |
| `2026_06_24_061357_create_ai_analysis_log_table.php` | `ai_analysis_log` | Detailed LLM tracking: latency, tokens, costs, model used, and error logs. |

## 2. Migration Execution Status
The schema builds successfully using SQLite / PostgreSQL drivers. Running:
```bash
php artisan migrate:fresh --seed
```
produces:
*   All migrations completed successfully.
*   `Database\Seeders\RolesAndPermissionsSeeder` successfully seeded permissions for both `web` and `api` guards.
*   `Database\Seeders\AdminUserSeeder` successfully registered the `admin@medimind.ai` account with the `super_admin` role.
