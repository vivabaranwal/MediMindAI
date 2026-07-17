<?php

namespace App\Repositories;

use App\Models\Prescription;
use App\Repositories\Contracts\PrescriptionRepositoryInterface;

class PrescriptionRepository implements PrescriptionRepositoryInterface
{
    public function find(int $id): ?Prescription
    {
        return Prescription::find($id);
    }

    public function findByEncounterId(int $encounterId): ?Prescription
    {
        return Prescription::where('encounter_id', $encounterId)->first();
    }

    public function create(array $data): Prescription
    {
        return Prescription::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $prescription = $this->find($id);
        if ($prescription) {
            return $prescription->update($data);
        }
        return false;
    }
}
