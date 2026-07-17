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
        Schema::create('surgeries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->onDelete('set null');
            $table->string('surgery_name', 255);
            $table->string('surgery_type', 100)->nullable();
            $table->string('icd_code', 20)->nullable();
            $table->date('scheduled_date')->nullable();
            $table->string('status', 20)->default('planned'); // planned, scheduled, completed, cancelled
            $table->boolean('ai_suggested')->default(false);
            $table->text('pre_op_notes')->nullable();
            $table->text('post_op_notes')->nullable();
            $table->text('complications')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surgeries');
    }
};
