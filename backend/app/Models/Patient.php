<?php

namespace App\Models;

use App\Casts\EncryptedDate;
use App\Casts\EncryptedJson;
use App\Support\BlindIndex;
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
        'medical_history',
        'current_medications',
        'abha_id',
        'emergency_contact_name',
        'emergency_contact_mobile',
        'is_active',
    ];

    /** Blind-index columns are internal and never serialised. */
    protected $hidden = ['mobile_hash', 'search_index'];

    protected $casts = [
        // Patient identifiers and clinical background are encrypted at rest (see docs/SECURITY.md).
        'name' => 'encrypted',
        'mobile' => 'encrypted',
        'email' => 'encrypted',
        'address' => 'encrypted',
        'abha_id' => 'encrypted',
        'emergency_contact_name' => 'encrypted',
        'emergency_contact_mobile' => 'encrypted',
        'date_of_birth' => EncryptedDate::class,
        'is_active' => 'boolean',
        'medical_history' => EncryptedJson::class,
        'current_medications' => EncryptedJson::class,
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
     * Search by patient code, name (word prefixes of 3+ letters) or mobile number (digits).
     * Names and numbers are encrypted, so this matches keyed hashes instead (see BlindIndex).
     */
    public function scopeSearch($query, $term)
    {
        $term = trim((string) $term);
        $groups = BlindIndex::searchGroups($term);

        return $query->where(function ($q) use ($term, $groups) {
            $q->where('patient_code', 'like', '%' . $term . '%');

            if ($groups) {
                $q->orWhere(function ($byIdentity) use ($groups) {
                    foreach ($groups as $anyOf) {
                        $byIdentity->where(function ($any) use ($anyOf) {
                            foreach ($anyOf as $token) {
                                $any->orWhere('search_index', 'like', '%' . $token . '%');
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Bootstrap the model and generate patient code.
     */
    protected static function boot()
    {
        parent::boot();

        // Keep the searchable blind index in step with the encrypted name and mobile.
        static::saving(function (Patient $patient) {
            if (! $patient->exists || $patient->isDirty(['name', 'mobile']) || $patient->search_index === null) {
                $patient->mobile_hash = BlindIndex::mobileHash($patient->mobile);
                $patient->search_index = implode(' ', BlindIndex::patientTokens($patient->name, $patient->mobile));
            }
        });

        static::creating(function ($patient) {
            $nextId = (static::max('id') ?? 0) + 1;
            $patient->patient_code = 'MM-' . date('Y') . '-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        });
    }
}
