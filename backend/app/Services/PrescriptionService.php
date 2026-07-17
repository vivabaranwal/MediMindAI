<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\Encounter;
use App\Repositories\Contracts\PrescriptionRepositoryInterface;
use Illuminate\Validation\ValidationException;

class PrescriptionService
{
    protected PrescriptionRepositoryInterface $prescriptionRepository;

    public function __construct(PrescriptionRepositoryInterface $prescriptionRepository)
    {
        $this->prescriptionRepository = $prescriptionRepository;
    }

    /**
     * Get prescription for a specific encounter.
     */
    public function getPrescriptionForEncounter(int $encounterId): ?Prescription
    {
        return $this->prescriptionRepository->findByEncounterId($encounterId);
    }

    /**
     * Save draft prescription. Enforces duplicate therapy and approval checks.
     */
    public function saveDraft(int $encounterId, array $data, int $doctorId): Prescription
    {
        $prescription = $this->prescriptionRepository->findByEncounterId($encounterId);

        if ($prescription && $prescription->doctor_approved) {
            throw ValidationException::withMessages([
                'prescription' => ['An approved prescription cannot be modified.'],
            ]);
        }

        // Check for duplicate therapies internally
        $medicines = $data['medicines'] ?? [];
        $names = [];
        foreach ($medicines as $med) {
            $name = strtolower(trim($med['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            if (in_array($name, $names)) {
                throw ValidationException::withMessages([
                    'medicines' => ["Duplicate medication detected: {$med['name']}"],
                ]);
            }
            $names[] = $name;
        }

        if (!$prescription) {
            $encounter = Encounter::find($encounterId);
            if (!$encounter) {
                throw new \Exception('Encounter not found.');
            }

            $data['encounter_id'] = $encounterId;
            $data['patient_id'] = $encounter->patient_id;
            $data['doctor_id'] = $doctorId;
            $data['doctor_approved'] = false;

            $prescription = $this->prescriptionRepository->create($data);
        } else {
            $this->prescriptionRepository->update($prescription->id, $data);
            $prescription = $prescription->fresh();
        }

        return $prescription;
    }

    /**
     * Approve a prescription.
     */
    public function approvePrescription(int $prescriptionId, int $doctorId): Prescription
    {
        $prescription = $this->prescriptionRepository->find($prescriptionId);
        if (!$prescription) {
            throw new \Exception('Prescription not found.');
        }

        if ($prescription->doctor_approved) {
            throw ValidationException::withMessages([
                'prescription' => ['This prescription is already approved.'],
            ]);
        }

        $this->prescriptionRepository->update($prescription->id, [
            'doctor_approved' => true,
            'approved_at' => now(),
        ]);

        return $prescription->fresh();
    }
}
