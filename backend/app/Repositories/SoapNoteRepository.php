<?php

namespace App\Repositories;

use App\Models\SoapNote;
use App\Repositories\Contracts\SoapNoteRepositoryInterface;

class SoapNoteRepository implements SoapNoteRepositoryInterface
{
    public function find(int $id): ?SoapNote
    {
        return SoapNote::find($id);
    }

    public function findByEncounterId(int $encounterId): ?SoapNote
    {
        return SoapNote::where('encounter_id', $encounterId)->first();
    }

    public function create(array $data): SoapNote
    {
        return SoapNote::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $soapNote = $this->find($id);
        if ($soapNote) {
            return $soapNote->update($data);
        }
        return false;
    }
}
