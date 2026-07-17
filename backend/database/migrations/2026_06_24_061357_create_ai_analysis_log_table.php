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
        Schema::create('ai_analysis_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->onDelete('set null');
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->onDelete('set null');
            $table->string('agent_name', 100)->nullable(); // intake_agent, report_reader, etc.
            $table->string('analysis_type', 100)->nullable();
            $table->text('input_summary')->nullable();
            $table->text('output_summary')->nullable();
            $table->string('llm_model', 50)->nullable();
            $table->integer('tokens_used')->nullable();
            $table->decimal('cost_usd', 10, 6)->nullable();
            $table->integer('latency_ms')->nullable();
            $table->string('status', 20)->default('success'); // success, failed
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_analysis_log');
    }
};
