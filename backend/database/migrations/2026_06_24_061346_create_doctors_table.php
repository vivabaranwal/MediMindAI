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
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('registration_number', 50)->unique();
            $table->string('specialization', 100);
            $table->text('qualification')->nullable();
            $table->integer('experience_years')->default(0);
            $table->decimal('consultation_fee', 10, 2)->nullable();
            $table->json('available_days')->nullable(); // stored as JSON
            $table->integer('slot_duration_mins')->default(15);
            $table->text('bio')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
