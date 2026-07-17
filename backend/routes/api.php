<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\EncounterController;
use App\Http\Controllers\Api\SoapNoteController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AiBriefController;
use App\Http\Controllers\Api\FollowupController;
use App\Http\Controllers\Api\OutcomeController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AnalyticsController;

// ─── PUBLIC ROUTES ───────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/send-otp',    [OtpController::class, 'send']);
    Route::post('/verify-otp',  [OtpController::class, 'verify']);
    Route::post('/login',       [LoginController::class, 'login']);
    Route::post('/register',    [LoginController::class, 'register']);
});

// ─── AUTHENTICATED ROUTES ────────────────────────────────────
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/auth/logout', [LoginController::class, 'logout']);
    
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // ── Patients CRUD
    Route::apiResource('patients', PatientController::class);

    // ── Appointments & Queue
    Route::get('/appointments/queue',          [AppointmentController::class, 'queue']);
    Route::post('/appointments/{id}/cancel',    [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{id}/complete',  [AppointmentController::class, 'complete']);
    Route::patch('/appointments/{id}/status',   [AppointmentController::class, 'updateStatus']);
    Route::post('/appointments/{id}/assessment', [AppointmentController::class, 'saveAssessment']);
    Route::apiResource('appointments',          AppointmentController::class)->except(['destroy']);

    // ── Clinical Core (Doctors & Super Admins only)
    Route::middleware(['role:doctor|super_admin'])->group(function () {
        // Encounters
        Route::get('/encounters',                 [EncounterController::class, 'index']);
        Route::get('/encounters/{id}',            [EncounterController::class, 'show']);
        Route::post('/encounters/{id}/complete',  [EncounterController::class, 'complete']);

        // SOAP Notes
        Route::get('/encounters/{id}/soap',       [SoapNoteController::class, 'show']);
        Route::put('/encounters/{id}/soap',       [SoapNoteController::class, 'update']);
        Route::post('/encounters/{id}/sign',      [SoapNoteController::class, 'sign']);

        // Prescriptions
        Route::get('/prescriptions',              [PrescriptionController::class, 'index']);
        Route::post('/prescriptions',             [PrescriptionController::class, 'store']);
        Route::post('/prescriptions/{id}/approve', [PrescriptionController::class, 'approve']);

        // AI Doctor Briefs
        Route::get('/ai/briefs/{encounterId}',            [AiBriefController::class, 'show']);
        Route::post('/ai/briefs/{encounterId}/regenerate', [AiBriefController::class, 'regenerate']);
    });

    // ── Reports (Receptionists, Doctors, and Clinic Admins)
    Route::middleware(['role:front_desk|doctor|clinic_admin|super_admin'])->group(function () {
        Route::post('/reports/upload',            [ReportController::class, 'upload']);
        Route::get('/reports',                    [ReportController::class, 'index']);
        Route::get('/reports/{id}',               [ReportController::class, 'show']);
        Route::get('/reports/{id}/download',      [ReportController::class, 'download']);
    });

    // ── Follow-ups (Doctor, Front Desk)
    Route::middleware(['role:doctor|front_desk|super_admin'])->group(function () {
        Route::post('/followups',                 [FollowupController::class, 'store']);
        Route::get('/followups',                  [FollowupController::class, 'index']);
    });

    // ── Outcomes (Patient)
    Route::middleware(['role:patient|doctor|super_admin'])->group(function () {
        Route::post('/outcomes',                  [OutcomeController::class, 'store']);
        Route::get('/outcomes',                   [OutcomeController::class, 'index']);
    });

    // ── Admin User Management
    Route::middleware(['role:clinic_admin|super_admin'])->group(function () {
        Route::apiResource('admin/users', AdminUserController::class);
    });

    // ── Analytics & Reporting
    Route::middleware(['role:clinic_admin|super_admin|doctor'])->group(function () {
        Route::get('/analytics/doctor', [AnalyticsController::class, 'doctor']);
    });
    Route::middleware(['role:clinic_admin|super_admin'])->group(function () {
        Route::get('/analytics/clinic', [AnalyticsController::class, 'clinic']);
        Route::get('/analytics/outcomes', [AnalyticsController::class, 'outcomes']);
    });
});

// ─── INTERNAL SERVICES (Guarded by secret) ───────────────────
Route::get('/internal/encounter-context/{id}', [App\Http\Controllers\Api\EncounterController::class, 'getContext']);

