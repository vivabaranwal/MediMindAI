<?php

namespace App\Repositories\Contracts;

use App\Models\Prescription;

interface PrescriptionRepositoryInterface
{
    public function find(int $id): ?Prescription;
    public function findByEncounterId(int $encounterId): ?Prescription;
    public function create(array $data): Prescription;
    public function update(int $id, array $data): bool;
}
