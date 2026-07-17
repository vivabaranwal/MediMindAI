<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->onDelete('set null');
            $table->string('report_type', 50); // blood_test, audiogram, ct_scan, xray, prescription, other
            $table->string('file_name', 255);
            $table->text('file_path'); // MinIO path
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('ai_summary')->nullable();
            $table->jsonb('ai_findings')->nullable();
            $table->boolean('ai_processed')->default(false);
            $table->string('status', 30)->default('pending_analysis');
            $table->timestamp('ai_processed_at')->nullable();
            $table->string('llm_model_used', 50)->nullable();
            $table->timestamp('uploaded_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index('patient_id');
            $table->index('encounter_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
