<?php

namespace App\Models;

use App\Enums\RiskLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiBrief extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'encounter_id',
        'patient_id',
        'doctor_id',
        'brief_text',
        'suggested_questions',
        'risk_level',
        'similar_cases',
        'llm_model_used',
        'token_count',
        'generation_time_ms',
        'reviewed_by_doctor',
        'doctor_feedback',
    ];

    protected $casts = [
        'suggested_questions' => 'array',
        'similar_cases' => 'array',
        'reviewed_by_doctor' => 'boolean',
        'risk_level' => RiskLevel::class,
        'created_at' => 'datetime',
    ];

    /**
     * Get the encounter associated with this brief.
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
