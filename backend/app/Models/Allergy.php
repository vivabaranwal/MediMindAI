<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Allergy extends Model
{
    protected $casts = [
        'allergen' => 'encrypted',
        'reaction' => 'encrypted',
    ];

    protected $fillable = [
        'patient_id',
        'allergen',
        'severity',
        'reaction',
    ];

    /**
     * Get the patient that has this allergy.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
