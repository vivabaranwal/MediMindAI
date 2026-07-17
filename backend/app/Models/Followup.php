<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Followup extends Model
{
    protected $fillable = [
        'encounter_id',
        'patient_id',
        'doctor_id',
        'scheduled_date',
        'status', // pending, reminded, responded, completed
        'medium', // whatsapp, sms, email, call
        'questions',
        'responses',
        'ai_summary',
        'sent_at',
        'responded_at',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'questions' => 'array',
        'responses' => 'array',
        'sent_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    /**
     * Get the encounter that generated the follow-up.
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
     * Get the doctor who configured the follow-up.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Get the treatment outcomes logged from this follow-up.
     */
    public function outcome(): HasOne
    {
        return $this->hasOne(Outcome::class);
    }
}
