<?php

namespace App\Repositories\Contracts;

use App\Models\SoapNote;

interface SoapNoteRepositoryInterface
{
    public function find(int $id): ?SoapNote;
    public function findByEncounterId(int $encounterId): ?SoapNote;
    public function create(array $data): SoapNote;
    public function update(int $id, array $data): bool;
}
