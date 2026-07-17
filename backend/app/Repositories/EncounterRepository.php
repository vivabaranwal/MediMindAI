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

    public function getActiveEncountersForDoctor(int $doctorId): Collection
    {
        return Encounter::where('doctor_id', $doctorId)
            ->where('status', '!=', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
