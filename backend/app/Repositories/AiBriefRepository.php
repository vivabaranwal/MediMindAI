<?php

namespace App\Repositories;

use App\Models\AiBrief;
use App\Repositories\Contracts\AiBriefRepositoryInterface;

class AiBriefRepository implements AiBriefRepositoryInterface
{
    public function find(int $id): ?AiBrief
    {
        return AiBrief::find($id);
    }

    public function findByEncounterId(int $encounterId): ?AiBrief
    {
        return AiBrief::where('encounter_id', $encounterId)->first();
    }

    public function create(array $data): AiBrief
    {
        return AiBrief::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $aiBrief = $this->find($id);
        if ($aiBrief) {
            return $aiBrief->update($data);
        }
        return false;
    }
}
