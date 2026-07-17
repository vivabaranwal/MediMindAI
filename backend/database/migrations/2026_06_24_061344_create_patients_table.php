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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('patient_code', 20)->unique();
            $table->text('name'); // Store encrypted name
            $table->date('date_of_birth')->nullable();
            $table->integer('age')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('mobile', 15); // Store encrypted mobile
            $table->string('email', 255)->nullable();
            $table->text('address')->nullable();
            $table->string('blood_group', 5)->nullable();
            $table->string('abha_id', 50)->nullable();
            $table->string('emergency_contact_name', 255)->nullable();
            $table->string('emergency_contact_mobile', 15)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('patient_code');
            $table->index('mobile');
            $table->index('abha_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
