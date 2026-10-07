<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** The diagnosis (the issue being treated) printed on the prescription. Encrypted at rest via the model cast. */
    public function up(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->text('diagnosis')->nullable()->after('medicines');
        });
    }

    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn('diagnosis');
        });
    }
};
