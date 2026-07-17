<?php

namespace App\Services;

use App\Models\Followup;
use App\Models\Encounter;
use App\Repositories\Contracts\FollowupRepositoryInterface;
use Illuminate\Support\Collection;

class FollowupService
{
    protected FollowupRepositoryInterface $followupRepository;

    public function __construct(FollowupRepositoryInterface $followupRepository)
    {
        $this->followupRepository = $followupRepository;
    }

    /**
     * Create scheduled follow-up.
     */
    public function createFollowup(array $data, int $doctorId): Followup
    {
        $encounter = Encounter::find($data['encounter_id']);
        if (!$encounter) {
            throw new \Exception('Encounter not found.');
        }

        $data['doctor_id'] = $doctorId;
        $data['status'] = 'pending';

        return $this->followupRepository->create($data);
    }

    /**
     * List follow-ups for a patient.
     */
    public function getFollowupsForPatient(int $patientId): Collection
    {
        return $this->followupRepository->findByPatientId($patientId);
    }
}
