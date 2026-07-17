<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientConsent extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'patient_id',
        'consent_type',
        'consented',
        'ip_address',
        'consented_at',
        'expires_at',
    ];

    protected $casts = [
        'consented' => 'boolean',
        'consented_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Get the patient who granted the consent.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
