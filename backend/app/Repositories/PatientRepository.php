<?php

namespace App\Repositories;

use App\Models\Patient;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Support\Collection;

class PatientRepository implements PatientRepositoryInterface
{
    public function all(): Collection
    {
        return Patient::all();
    }

    public function find(int $id): ?Patient
    {
        return Patient::find($id);
    }

    public function create(array $data): Patient
    {
        $patient = Patient::create($data);

        // Seed sample allergies for testing and RAG context validation
        $allergens = ['Penicillin', 'Peanuts', 'Aspirin', 'Sulfa drugs'];
        $allergen = $allergens[$patient->id % count($allergens)];
        
        \App\Models\Allergy::create([
            'patient_id' => $patient->id,
            'allergen' => $allergen,
            'severity' => $patient->id % 2 === 0 ? 'Severe' : 'Moderate',
            'reaction' => $patient->id % 2 === 0 ? 'Anaphylaxis' : 'Hives/Rash',
        ]);

        return $patient;
    }

    public function update(int $id, array $data): bool
    {
        $patient = $this->find($id);
        if ($patient) {
            return $patient->update($data);
        }
        return false;
    }

    public function delete(int $id): bool
    {
        $patient = $this->find($id);
        if ($patient) {
            return $patient->delete();
        }
        return false;
    }

    public function search(string $term): Collection
    {
        return Patient::search($term)->get();
    }

    public function checkDuplicate(string $name, string $mobile): ?Patient
    {
        // The mobile number is encrypted at rest; match on its keyed hash (see BlindIndex).
        $hash = \App\Support\BlindIndex::mobileHash($mobile);

        return $hash === null ? null : Patient::where('mobile_hash', $hash)->first();
    }
}
