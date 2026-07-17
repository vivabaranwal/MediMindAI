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
        Schema::create('ai_briefs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_id')->constrained('encounters')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->text('brief_text');
            $table->jsonb('suggested_questions')->nullable();
            $table->string('risk_level', 20)->default('low'); // low, medium, high, critical
            $table->jsonb('similar_cases')->nullable();
            $table->string('llm_model_used', 50)->nullable();
            $table->integer('token_count')->nullable();
            $table->integer('generation_time_ms')->nullable();
            $table->boolean('reviewed_by_doctor')->default(false);
            $table->text('doctor_feedback')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_briefs');
    }
};
