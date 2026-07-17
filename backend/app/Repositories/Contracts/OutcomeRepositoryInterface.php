<?php

namespace App\Repositories\Contracts;

use App\Models\Outcome;
use Illuminate\Support\Collection;

interface OutcomeRepositoryInterface
{
    public function find(int $id): ?Outcome;
    public function findByPatientId(int $patientId): Collection;
    public function create(array $data): Outcome;
}
