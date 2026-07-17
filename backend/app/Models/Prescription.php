<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Prescription extends Model
{
    use HasFactory;

    protected $fillable = [
        'prescription_no',
        'encounter_id',
        'patient_id',
        'doctor_id',
        'medicines',
        'instructions',
        'followup_date',
        'is_ai_drafted',
        'doctor_approved',
        'approved_at',
        'pdf_path',
    ];

    protected $casts = [
        'medicines' => 'array',
        'is_ai_drafted' => 'boolean',
        'doctor_approved' => 'boolean',
        'approved_at' => 'datetime',
        'followup_date' => 'date',
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

    /**
     * Generate sequential prescription number on creation.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($prescription) {
            $nextId = (static::max('id') ?? 0) + 1;
            $prescription->prescription_no = 'RX-' . date('Y') . '-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        });
    }
}
