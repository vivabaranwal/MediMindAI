<?php

namespace App\Services;

use App\Models\User;
use App\Models\Patient;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use App\Enums\UserRole;

class PatientService
{
    protected PatientRepositoryInterface $patientRepository;

    public function __construct(PatientRepositoryInterface $patientRepository)
    {
        $this->patientRepository = $patientRepository;
    }

    /**
     * Onboard a new patient.
     */
    public function onboardPatient(array $data): Patient
    {
        $mobile = $data['mobile'];

        // 1. Check for duplicate patient record
        $duplicate = $this->patientRepository->checkDuplicate($data['name'], $mobile);
        if ($duplicate) {
            throw ValidationException::withMessages([
                'mobile' => ['A patient with this mobile number is already registered.'],
            ]);
        }

        // 2. Perform transactional user + patient creation
        return DB::transaction(function () use ($data, $mobile) {
            // Create user account for portal access
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'mobile' => $mobile,
                'password' => null,
                'role' => UserRole::Patient->value,
                'status' => 'active',
            ]);

            $user->assignRole('patient');

            // Map user relation ID
            $data['user_id'] = $user->id;

            return $this->patientRepository->create($data);
        });
    }

    /**
     * Get patient profile.
     */
    public function getPatientProfile(int $id): ?Patient
    {
        return $this->patientRepository->find($id);
    }

    /**
     * Update patient profile.
     */
    public function updatePatientProfile(int $id, array $data): bool
    {
        $patient = $this->patientRepository->find($id);
        if (!$patient) {
            return false;
        }

        return DB::transaction(function () use ($patient, $data) {
            $user = $patient->user;
            if ($user) {
                $userUpdates = [];
                if (isset($data['name'])) $userUpdates['name'] = $data['name'];
                if (isset($data['mobile'])) $userUpdates['mobile'] = $data['mobile'];
                if (isset($data['email'])) $userUpdates['email'] = $data['email'];
                if (isset($data['is_active'])) $userUpdates['status'] = $data['is_active'] ? 'active' : 'inactive';
                
                if (!empty($userUpdates)) {
                    $user->update($userUpdates);
                }
            }

            return $patient->update($data);
        });
    }

    /**
     * List and search patients.
     */
    public function searchPatients(string $term)
    {
        return $this->patientRepository->search($term);
    }

    /**
     * Get all patients.
     */
    public function getAllPatients()
    {
        return $this->patientRepository->all();
    }
}
