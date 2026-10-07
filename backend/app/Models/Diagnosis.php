<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Diagnosis extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'encounter_id',
        'patient_id',
        'doctor_id',
        'icd_code',
        'diagnosis_name',
        'diagnosis_type', // primary, secondary, differential
        'is_ai_suggested',
        'ai_confidence',
        'doctor_confirmed',
        'notes',
    ];

    protected $casts = [
        'notes' => 'encrypted',
        'is_ai_suggested' => 'boolean',
        'doctor_confirmed' => 'boolean',
        'ai_confidence' => 'float',
        'created_at' => 'datetime',
    ];

    /**
     * Get the encounter.
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

    /**
     * Get the doctor.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
