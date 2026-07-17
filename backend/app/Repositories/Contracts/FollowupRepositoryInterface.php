<?php

namespace App\Repositories\Contracts;

use App\Models\Followup;
use Illuminate\Support\Collection;

interface FollowupRepositoryInterface
{
    public function find(int $id): ?Followup;
    public function findByPatientId(int $patientId): Collection;
    public function create(array $data): Followup;
    public function update(int $id, array $data): bool;
}
