<?php

namespace App\Repositories;

use App\Models\Report;
use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Support\Collection;

class ReportRepository implements ReportRepositoryInterface
{
    public function find(int $id): ?Report
    {
        return Report::find($id);
    }

    public function findByPatientId(int $patientId): Collection
    {
        return Report::where('patient_id', $patientId)
            ->orderBy('uploaded_at', 'desc')
            ->get();
    }

    public function create(array $data): Report
    {
        return Report::create($data);
    }
}
