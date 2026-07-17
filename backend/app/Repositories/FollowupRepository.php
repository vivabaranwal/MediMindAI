<?php

namespace App\Repositories;

use App\Models\Followup;
use App\Repositories\Contracts\FollowupRepositoryInterface;
use Illuminate\Support\Collection;

class FollowupRepository implements FollowupRepositoryInterface
{
    public function find(int $id): ?Followup
    {
        return Followup::find($id);
    }

    public function findByPatientId(int $patientId): Collection
    {
        return Followup::where('patient_id', $patientId)
            ->orderBy('scheduled_date', 'asc')
            ->get();
    }

    public function create(array $data): Followup
    {
        return Followup::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $followup = $this->find($id);
        if ($followup) {
            return $followup->update($data);
        }
        return false;
    }
}
