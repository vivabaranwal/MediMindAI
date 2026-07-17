<?php

namespace App\Repositories;

use App\Models\Outcome;
use App\Repositories\Contracts\OutcomeRepositoryInterface;
use Illuminate\Support\Collection;

class OutcomeRepository implements OutcomeRepositoryInterface
{
    public function find(int $id): ?Outcome
    {
        return Outcome::find($id);
    }

    public function findByPatientId(int $patientId): Collection
    {
        return Outcome::where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function create(array $data): Outcome
    {
        return Outcome::create($data);
    }
}
