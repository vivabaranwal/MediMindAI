<?php

namespace App\Repositories\Contracts;

use App\Models\Patient;
use Illuminate\Support\Collection;

interface PatientRepositoryInterface
{
    public function all(): Collection;
    public function find(int $id): ?Patient;
    public function create(array $data): Patient;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function search(string $term): Collection;
    public function checkDuplicate(string $name, string $mobile): ?Patient;
}
