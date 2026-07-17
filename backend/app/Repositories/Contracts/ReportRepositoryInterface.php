<?php

namespace App\Repositories\Contracts;

use App\Models\Report;
use Illuminate\Support\Collection;

interface ReportRepositoryInterface
{
    public function find(int $id): ?Report;
    public function findByPatientId(int $patientId): Collection;
    public function create(array $data): Report;
}
