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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('appointment_no', 20)->unique();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->date('appointment_date');
            $table->time('appointment_time');
            $table->integer('slot_token')->nullable();
            $table->string('type', 20)->default('regular'); // regular, urgent, walk_in, follow_up
            $table->string('status', 20)->default('booked'); // booked, confirmed, in_queue, in_consultation, completed, cancelled, no_show
            $table->string('triage_level', 10)->default('green'); // red, amber, green
            $table->text('chief_complaint')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('booked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('patient_id');
            $table->index(['doctor_id', 'appointment_date']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
