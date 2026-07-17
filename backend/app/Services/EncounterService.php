<?php

namespace App\Services;

use App\Models\Encounter;
use App\Models\Appointment;
use App\Repositories\EncounterRepository;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class EncounterService
{
    protected EncounterRepository $encounterRepository;

    public function __construct(EncounterRepository $encounterRepository)
    {
        $this->encounterRepository = $encounterRepository;
    }

    /**
     * Get active encounters for a specific doctor.
     */
    public function getActiveEncountersForDoctor(int $doctorId): Collection
    {
        return $this->encounterRepository->getActiveEncountersForDoctor($doctorId);
    }

    /**
     * Get encounter details.
     */
    public function getEncounter(int $id): ?Encounter
    {
        return $this->encounterRepository->find($id);
    }

    /**
     * Complete an encounter. Enforces signed SOAP note prerequisite.
     */
    public function completeEncounter(int $encounterId): Encounter
    {
        $encounter = $this->encounterRepository->find($encounterId);
        if (!$encounter) {
            throw new \Exception('Encounter not found.');
        }

        if ($encounter->status === 'completed') {
            return $encounter;
        }

        // Validate clinical precondition: must have a signed SOAP note
        $soapNote = $encounter->soapNote;
        if (!$soapNote || !$soapNote->doctor_signed) {
            throw ValidationException::withMessages([
                'encounter' => ['Encounter completion requires a signed SOAP note.'],
            ]);
        }

        DB::transaction(function () use ($encounter) {
            // Update encounter status
            $this->encounterRepository->update($encounter->id, [
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Synchronize related appointment
            if ($encounter->appointment_id) {
                $appointment = Appointment::find($encounter->appointment_id);
                if ($appointment) {
                    $appointment->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                }
            }
        });

        return $encounter->fresh();
    }
}
