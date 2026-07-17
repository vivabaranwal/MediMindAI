<?php

namespace App\Models;

use App\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_no',
        'patient_id',
        'doctor_id',
        'appointment_date',
        'appointment_time',
        'slot_token',
        'type',
        'status',
        'triage_level',
        'chief_complaint',
        'notes',
        'booked_by',
        'cancelled_at',
        'cancel_reason',
        'completed_at',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'status' => AppointmentStatus::class,
    ];

    /**
     * Get the patient associated with the appointment.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the doctor associated with the appointment.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Get the user who booked the appointment.
     */
    public function bookedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
    }

    /**
     * Generate sequential appointment number on creation.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appointment) {
            $nextId = (static::max('id') ?? 0) + 1;
            $appointment->appointment_no = 'APT-' . date('Y') . '-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        });
    }
}
