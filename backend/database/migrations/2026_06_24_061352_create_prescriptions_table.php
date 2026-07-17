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
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->string('prescription_no', 20)->unique();
            $table->foreignId('encounter_id')->constrained('encounters')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->jsonb('medicines'); // Store structured medicines list
            $table->text('instructions')->nullable();
            $table->date('followup_date')->nullable();
            $table->boolean('is_ai_drafted')->default(false);
            $table->boolean('doctor_approved')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->text('pdf_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
