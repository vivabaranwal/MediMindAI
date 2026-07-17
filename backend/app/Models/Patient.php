<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'patient_code',
        'name',
        'date_of_birth',
        'age',
        'gender',
        'mobile',
        'email',
        'address',
        'blood_group',
        'abha_id',
        'emergency_contact_name',
        'emergency_contact_mobile',
        'is_active',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Get the user profile associated with this patient (if registered for portal).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the patient's appointments.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get the patient's clinical encounters.
     */
    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }

    /**
     * Get the patient's uploaded reports.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Get the patient's prescriptions.
     */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    /**
     * Get the patient's DPDP consents.
     */
    public function consents(): HasMany
    {
        return $this->hasMany(PatientConsent::class);
    }

    /**
     * Get the patient's allergies.
     */
    public function allergies(): HasMany
    {
        return $this->hasMany(Allergy::class);
    }

    /**
     * Scope query to active patients.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query to search patients by name, mobile, or patient code.
     */
    public function scopeSearch($query, $term)
    {
        return $query->where(function($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('mobile', 'like', "%{$term}%")
              ->orWhere('patient_code', 'like', "%{$term}%");
        });
    }


    /**
     * Bootstrap the model and generate patient code.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($patient) {
            $nextId = (static::max('id') ?? 0) + 1;
            $patient->patient_code = 'MM-' . date('Y') . '-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        });
    }
}
