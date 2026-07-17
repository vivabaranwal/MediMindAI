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
        Schema::create('followups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->onDelete('set null');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->date('scheduled_date');
            $table->string('status', 20)->default('pending'); // pending, reminded, responded, completed
            $table->string('medium', 20)->default('whatsapp'); // whatsapp, sms, email, call
            $table->jsonb('questions')->nullable();
            $table->jsonb('responses')->nullable();
            $table->text('ai_summary')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('followups');
    }
};
