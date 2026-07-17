<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Outcome extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'followup_id',
        'encounter_id',
        'patient_id',
        'treatment_worked', // improved, no_change, worsened
        'symptom_scores',
        'side_effects',
        'patient_notes',
        'ai_outcome_label',
        'fed_to_learning',
    ];

    protected $casts = [
        'symptom_scores' => 'array',
        'side_effects' => 'array',
        'fed_to_learning' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Get the follow-up record.
     */
    public function followup(): BelongsTo
    {
        return $this->belongsTo(Followup::class);
    }

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
}
