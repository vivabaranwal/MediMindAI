<?php

namespace App\Repositories;

use App\Models\Encounter;
use Illuminate\Support\Collection;

class EncounterRepository
{
    public function find(int $id): ?Encounter
    {
        return Encounter::find($id);
    }

    public function create(array $data): Encounter
    {
        return Encounter::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $encounter = $this->find($id);
        if ($encounter) {
            return $encounter->update($data);
        }
        return false;
    }

    public function getActiveEncounterForAppointment(int $appointmentId): ?Encounter
    {
        return Encounter::where('appointment_id', $appointmentId)
            ->where('status', '!=', 'completed')
            ->first();
    }

    /**
     * A doctor's encounters: all active ones, plus completed ones when asked.
     *
     * @param  string  $completed  'none' (active only), 'today' (plus encounters completed today) or 'all'
     */
    public function getEncountersForDoctor(int $doctorId, string $completed = 'none'): Collection
    {
        return Encounter::where('doctor_id', $doctorId)
            ->when($completed === 'none', fn ($q) => $q->where('status', '!=', 'completed'))
            ->when($completed === 'today', fn ($q) => $q->where(fn ($w) => $w
                ->where('status', '!=', 'completed')
                ->orWhereDate('completed_at', today())))
            ->with(['patient.allergies', 'appointment', 'doctor.user'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getActiveEncountersForDoctor(int $doctorId): Collection
    {
        return Encounter::where('doctor_id', $doctorId)
            ->where('status', '!=', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
