<?php

use App\Support\PhiProtector;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Application-level encryption of patient data at rest.
 *
 * 1. Widen columns that were too short for ciphertext and drop indexes/uniques that are meaningless on it.
 * 2. Add blind-index columns (keyed hashes) so mobile lookup and name search keep working.
 * 3. Encrypt every existing row in place (idempotent; see PhiProtector).
 *
 * BACK UP THE DATABASE BEFORE RUNNING IN PRODUCTION, and keep APP_KEY: encrypted data cannot be read without it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['mobile']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->text('name')->change();
            $table->text('mobile')->change();
            $table->string('mobile_hash', 64)->nullable()->index();
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['mobile']);
            $table->dropIndex(['abha_id']);
        });
        Schema::table('patients', function (Blueprint $table) {
            foreach (['mobile', 'email', 'abha_id', 'emergency_contact_name', 'emergency_contact_mobile', 'date_of_birth'] as $col) {
                $table->text($col)->nullable($col !== 'mobile')->change();
            }
            $table->string('mobile_hash', 64)->nullable()->index();
            $table->text('search_index')->nullable();
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->text('file_name')->change();
        });

        Schema::table('allergies', function (Blueprint $table) {
            $table->text('allergen')->change();
            $table->text('reaction')->nullable()->change();
        });

        PhiProtector::protectAll();
    }

    public function down(): void
    {
        // Data is decrypted back to plaintext; the widened columns are left as they are (harmless).
        PhiProtector::revealAll();

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['mobile_hash', 'search_index']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('mobile_hash');
        });
    }
};
