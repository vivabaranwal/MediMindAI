<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Surgery extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'encounter_id',
        'surgery_name',
        'surgery_type',
        'icd_code',
        'scheduled_date',
        'status', // planned, scheduled, completed, cancelled
        'ai_suggested',
        'pre_op_notes',
        'post_op_notes',
        'complications',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'ai_suggested' => 'boolean',
    ];

    /**
     * Get the patient undergoing surgery.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the doctor performing the surgery.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Get the encounter where the surgery was recommended.
     */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }
}
