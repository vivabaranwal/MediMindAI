<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Symptom;
use App\Models\SoapNote;
use App\Repositories\Contracts\AppointmentRepositoryInterface;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use App\Enums\AppointmentStatus;

class AppointmentService
{
    protected AppointmentRepositoryInterface $appointmentRepository;

    public function __construct(AppointmentRepositoryInterface $appointmentRepository)
    {
        $this->appointmentRepository = $appointmentRepository;
    }

    /**
     * Book a new appointment.
     */
    public function bookAppointment(array $data, int $bookedByUserId): Appointment
    {
        // Every new patient goes to the junior doctor first; the junior picks the senior at handoff.
        $doctorId = $this->junior()->id;
        $data['doctor_id'] = $doctorId;
        $date = $data['appointment_date'];
        $time = Carbon::parse($data['appointment_time'])->format('H:i:s');

        // 2. Generate a queue slot token (token sequence for doctor on that date)
        $tokenCount = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->count();
        $slotToken = $tokenCount + 1;

        // 3. Prepare data
        $data['slot_token'] = $slotToken;
        $data['booked_by'] = $bookedByUserId;
        $data['appointment_time'] = $time;
        $data['status'] = AppointmentStatus::Booked->value;

        // 4. Create and return
        return $this->appointmentRepository->create($data);
    }

    /**
     * The junior doctor who takes new intakes: the active junior with the fewest open cases today.
     */
    protected function junior(): Doctor
    {
        $junior = Doctor::where('level', Doctor::LEVEL_JUNIOR)
            ->where('is_active', true)
            ->withCount(['appointments as open_cases' => fn ($q) => $q
                ->whereDate('appointment_date', Carbon::today())
                ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])])
            ->orderBy('open_cases')
            ->orderBy('id')
            ->first();

        if (! $junior) {
            throw ValidationException::withMessages([
                'doctor_id' => ['No junior doctor is available to take this patient.'],
            ]);
        }

        return $junior;
    }

    /**
     * Get the daily consultation queue.
     * Sorted by:
     *   1. triage_level (red > amber > green)
     *   2. appointment_time (chronological)
     */
    public function getDailyQueue(int $doctorId, ?string $date = null): Collection
    {
        $targetDate = $date ?? Carbon::today()->toDateString();

        return Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $targetDate)
            ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
            ->orderByRaw("CASE 
                WHEN triage_level = 'red' THEN 1 
                WHEN triage_level = 'amber' THEN 2 
                ELSE 3 
            END ASC")
            ->orderBy('appointment_time', 'asc')
            ->with(['patient.allergies', 'doctor.user'])
            ->get();
    }

    /**
     * Update appointment status.
     */
    public function updateStatus(int $id, string $status, ?string $cancelReason = null): Appointment
    {
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment) {
            throw new \Exception('Appointment not found.');
        }

        $updates = ['status' => $status];

        if ($status === 'cancelled') {
            $updates['cancelled_at'] = now();
            $updates['cancel_reason'] = $cancelReason;
        } elseif ($status === 'completed') {
            $updates['completed_at'] = now();
        }

        DB::transaction(function () use ($appointment, $updates, $status) {
            $appointment->update($updates);

            // Trigger Encounter creation if status transitions to 'in_consultation'
            if ($status === 'in_consultation') {
                $this->triggerEncounterCreation($appointment);
            }
        });

        return $appointment;
    }

    /**
     * Helper to trigger Encounter creation when doctor starts consultation.
     */
    protected function triggerEncounterCreation(Appointment $appointment): void
    {
        $exists = Encounter::where('appointment_id', $appointment->id)->exists();
        if (!$exists) {
            Encounter::create([
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
                'encounter_date' => Carbon::today()->toDateString(),
                'status' => 'in_progress',
                'started_at' => now(),
            ]);
        }
    }

    /**
     * Save clinical assessment details and dispatch the patient.
     */
    public function saveAssessment(int $id, array $data): Appointment
    {
        // Identifiers only: the payload is clinical text and must not reach the logs.
        \Illuminate\Support\Facades\Log::info('[AppointmentService] saveAssessment initiated', [
            'appointment_id' => $id,
        ]);

        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment) {
            \Illuminate\Support\Facades\Log::error("[AppointmentService] saveAssessment failed: Appointment ID {$id} not found.");
            throw new \Exception('Appointment not found.');
        }

        try {
            DB::transaction(function () use ($appointment, $data) {
                // 0. Hand the case to the chosen reviewing doctor, if one was selected
                if (!empty($data['doctor_id']) && (int) $data['doctor_id'] !== (int) $appointment->doctor_id) {
                    $appointment->update(['doctor_id' => $data['doctor_id']]);
                    Encounter::where('appointment_id', $appointment->id)->update(['doctor_id' => $data['doctor_id']]);
                }

                // 1. Idempotently find or create the Encounter associated with this appointment
                $encounter = Encounter::firstOrCreate([
                    'appointment_id' => $appointment->id,
                ], [
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'encounter_date' => Carbon::today()->toDateString(),
                    'status' => 'in_progress',
                    'started_at' => now(),
                ]);

                \Illuminate\Support\Facades\Log::info('[AppointmentService] Encounter fetched/created', ['encounter_id' => $encounter->id]);

                // 2. Update the appointment triage level, chief complaint and set status to 'in_queue'
                $chiefComplaint = isset($data['chief_complaint']) && trim($data['chief_complaint']) !== '' 
                    ? $data['chief_complaint'] 
                    : ($appointment->chief_complaint ?: 'General Consultation');

                $appointment->update([
                    'triage_level' => $data['triage_level'],
                    'chief_complaint' => $chiefComplaint,
                    'status' => 'in_queue',
                ]);

                // 3. Save/Update Symptom record matching encounter_id
                $symptom = Symptom::updateOrCreate([
                    'encounter_id' => $encounter->id,
                ], [
                    'patient_id' => $appointment->patient_id,
                    'collected_via' => 'form',
                    'symptoms' => [
                        'vitals' => $data['vitals'] ?? null,
                        'questions' => $data['symptoms'] ?? [],
                        'summary' => $data['summary'] ?? null,
                    ],
                    'red_flags' => $data['summary']['red_flags'] ?? [],
                    'transcription' => $data['chief_complaint'] ?? '',
                    'ai_processed' => !empty($data['summary']),
                ]);

                \Illuminate\Support\Facades\Log::info('[AppointmentService] Symptom record updated/created', ['symptom_id' => $symptom->id]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[AppointmentService] Transaction failed: ' . $e->getMessage(), [
                'exception' => $e
            ]);
            throw $e;
        }

        return $appointment->fresh();
    }
}
