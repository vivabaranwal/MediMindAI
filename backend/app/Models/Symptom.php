<?php

namespace App\Models;

use App\Casts\EncryptedJson;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Symptom extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'encounter_id',
        'patient_id',
        'collected_via',
        'symptoms',
        'red_flags',
        'voice_file_path',
        'transcription',
        'ai_processed',
    ];

    protected $casts = [
        'transcription' => 'encrypted',
        'symptoms' => EncryptedJson::class,
        'red_flags' => EncryptedJson::class,
        'ai_processed' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Get the encounter associated with these symptoms.
     */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    /**
     * Get the patient.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
