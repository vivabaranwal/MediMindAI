<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Encounter extends Model
{
    use HasFactory;

    protected $fillable = [
        'encounter_no',
        'appointment_id',
        'patient_id',
        'doctor_id',
        'encounter_date',
        'encounter_type',
        'status',
        'ai_brief_id',
        'soap_note_id',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'encounter_date' => 'date',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the appointment associated with this encounter.
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
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

    /**
     * Get the SOAP notes.
     */
    public function soapNote(): HasOne
    {
        return $this->hasOne(SoapNote::class);
    }

    /**
     * Get the AI brief.
     */
    public function aiBrief(): HasOne
    {
        return $this->hasOne(AiBrief::class);
    }

    /**
     * Get the symptom assessment log.
     */
    public function symptom(): HasOne
    {
        return $this->hasOne(Symptom::class);
    }

    /**
     * Generate encounter number on creation.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($encounter) {
            $nextId = (static::max('id') ?? 0) + 1;
            $encounter->encounter_no = 'ENC-' . date('Y') . '-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        });
    }
}
