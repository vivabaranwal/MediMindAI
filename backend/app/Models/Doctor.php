<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Doctor extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'registration_number',
        'specialization',
        'qualification',
        'experience_years',
        'consultation_fee',
        'available_days',
        'slot_duration_mins',
        'bio',
        'is_active',
    ];

    protected $casts = [
        'available_days' => 'array',
        'is_active' => 'boolean',
        'consultation_fee' => 'decimal:2',
    ];

    /**
     * Get the user account associated with the doctor.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the appointments booked with the doctor.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get the doctor's encounters.
     */
    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }
}
