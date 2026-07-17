<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAnalysisLog extends Model
{
    protected $table = 'ai_analysis_log';

    const UPDATED_AT = null;

    protected $fillable = [
        'patient_id',
        'encounter_id',
        'agent_name',
        'analysis_type',
        'input_summary',
        'output_summary',
        'llm_model',
        'tokens_used',
        'cost_usd',
        'latency_ms',
        'status',
        'error_message',
    ];

    protected $casts = [
        'tokens_used' => 'integer',
        'cost_usd' => 'float',
        'latency_ms' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * Get the patient.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the encounter.
     */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }
}
