<?php

namespace App\Repositories\Contracts;

use App\Models\AiBrief;

interface AiBriefRepositoryInterface
{
    public function find(int $id): ?AiBrief;
    public function findByEncounterId(int $encounterId): ?AiBrief;
    public function create(array $data): AiBrief;
    public function update(int $id, array $data): bool;
}
