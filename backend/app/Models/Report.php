<?php

namespace App\Models;

use App\Enums\ReportType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'patient_id',
        'encounter_id',
        'report_type',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'uploaded_by',
        'ai_summary',
        'ai_findings',
        'ai_processed',
        'ai_processed_at',
        'llm_model_used',
        'uploaded_at',
        'status',
    ];

    protected $casts = [
        'ai_findings' => 'array',
        'ai_processed' => 'boolean',
        'ai_processed_at' => 'datetime',
        'uploaded_at' => 'datetime',
        'report_type' => ReportType::class,
    ];

    /**
     * Get the patient who owns this report.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the encounter (if any) during which this report was uploaded/linked.
     */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    /**
     * Get the user who uploaded the report.
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
