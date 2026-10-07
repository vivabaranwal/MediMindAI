<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The UI and the AI context both need these, but they were never stored.
        Schema::table('patients', function (Blueprint $table) {
            $table->jsonb('medical_history')->nullable()->after('blood_group');
            $table->jsonb('current_medications')->nullable()->after('medical_history');
        });

        Schema::table('reports', function (Blueprint $table) {
            // Machine-readable reason when analysis did not complete (e.g. ocr_failed, ai_consent_required).
            $table->string('analysis_error', 60)->nullable()->after('status');
        });

        Schema::table('ai_briefs', function (Blueprint $table) {
            $table->text('risk_rationale')->nullable()->after('risk_level');
            $table->jsonb('red_flags')->nullable()->after('risk_rationale');
        });
    }

    public function down(): void
    {
        Schema::table('ai_briefs', function (Blueprint $table) {
            $table->dropColumn(['risk_rationale', 'red_flags']);
        });
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('analysis_error');
        });
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['medical_history', 'current_medications']);
        });
    }
};
