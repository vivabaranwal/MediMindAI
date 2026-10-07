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
    public function onboardPatient(array $data, ?string $ip = null): Patient
    {
        $mobile = $data['mobile'];
        $aiConsent = $data['ai_consent'] ?? null;
        $dataConsent = $data['data_consent'] ?? null;
        $allergies = $data['allergies'] ?? [];
        unset($data['ai_consent'], $data['data_consent'], $data['allergies']);

        // 1. Check for duplicate patient record
        $duplicate = $this->patientRepository->checkDuplicate($data['name'], $mobile);
        if ($duplicate) {
            throw ValidationException::withMessages([
                'mobile' => ['A patient with this mobile number is already registered.'],
            ]);
        }

        // 2. Perform transactional user + patient creation
        return DB::transaction(function () use ($data, $mobile, $aiConsent, $dataConsent, $allergies, $ip) {
            // Create user account for portal access
            $user = User::create([
                'name' => $data['name'],
                'email' => null, // the patient's email lives (encrypted) on the patient record only
                'mobile' => $mobile,
                'password' => null,
                'role' => UserRole::Patient->value,
                'status' => 'active',
            ]);

            $user->assignRole('patient');

            // Map user relation ID
            $data['user_id'] = $user->id;

            $patient = $this->patientRepository->create($data);

            $consents = app(\App\Services\Ai\ConsentService::class);
            if ($dataConsent !== null) {
                $consents->record($patient, 'data_collection', (bool) $dataConsent, $ip);
            }
            if ($aiConsent !== null) {
                $consents->record($patient, \App\Services\Ai\ConsentService::AI, (bool) $aiConsent, $ip);
            }
            $this->replaceAllergies($patient, $allergies);

            return $patient->load('allergies');
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

        $allergies = $data['allergies'] ?? null;
        unset($data['allergies']);

        return DB::transaction(function () use ($patient, $data, $allergies) {
            if ($allergies !== null) {
                $this->replaceAllergies($patient, $allergies);
            }

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
     * The submitted list is the full, current allergy list for the patient.
     */
    private function replaceAllergies(Patient $patient, array $allergies): void
    {
        $patient->allergies()->delete();
        foreach ($allergies as $a) {
            $patient->allergies()->create([
                'allergen' => trim($a['allergen']),
                'reaction' => $a['reaction'] ?? null,
                'severity' => $a['severity'] ?? null,
            ]);
        }
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
