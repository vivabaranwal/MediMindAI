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
        Schema::create('outcomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('followup_id')->nullable()->constrained('followups')->onDelete('set null');
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->onDelete('set null');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->string('treatment_worked', 20)->nullable(); // improved, no_change, worsened
            $table->jsonb('symptom_scores')->nullable(); // {pain:3, hearing:7, congestion:2}
            $table->jsonb('side_effects')->nullable();
            $table->text('patient_notes')->nullable();
            $table->string('ai_outcome_label', 50)->nullable();
            $table->boolean('fed_to_learning')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outcomes');
    }
};
