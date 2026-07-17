<?php

namespace App\Services;

use App\Models\Outcome;
use App\Models\Encounter;
use App\Models\Appointment;
use App\Repositories\Contracts\OutcomeRepositoryInterface;
use App\Repositories\Contracts\FollowupRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class OutcomeService
{
    protected OutcomeRepositoryInterface $outcomeRepository;
    protected FollowupRepositoryInterface $followupRepository;

    public function __construct(
        OutcomeRepositoryInterface $outcomeRepository,
        FollowupRepositoryInterface $followupRepository
    ) {
        $this->outcomeRepository = $outcomeRepository;
        $this->followupRepository = $followupRepository;
    }

    /**
     * Record a new patient treatment outcome. Runs escalation checking.
     */
    public function recordOutcome(array $data): Outcome
    {
        return DB::transaction(function () use ($data) {
            $escalated = $this->detectEscalation($data);

            if ($escalated) {
                $data['ai_outcome_label'] = 'escalated';
            } else {
                $data['ai_outcome_label'] = 'normal';
            }

            // Create outcome record
            $outcome = $this->outcomeRepository->create($data);

            // Update followup if linked
            if (!empty($data['followup_id'])) {
                $followup = $this->followupRepository->find($data['followup_id']);
                if ($followup) {
                    $this->followupRepository->update($followup->id, [
                        'status' => 'responded',
                        'responded_at' => now(),
                        'responses' => $data,
                    ]);
                }
            }

            // If escalation detected, update appointment triage level to red
            if ($escalated && !empty($data['encounter_id'])) {
                $encounter = Encounter::find($data['encounter_id']);
                if ($encounter && $encounter->appointment_id) {
                    $appointment = Appointment::find($encounter->appointment_id);
                    if ($appointment) {
                        $appointment->update(['triage_level' => 'red']);
                    }
                }
            }

            return $outcome;
        });
    }

    /**
     * Get outcomes history for a patient.
     */
    public function getOutcomesForPatient(int $patientId): Collection
    {
        return $this->outcomeRepository->findByPatientId($patientId);
    }

    /**
     * Detect escalation triggers from patient outcome questionnaire responses.
     */
    protected function detectEscalation(array $data): bool
    {
        // 1. Check if treatment worked is worsened
        if (($data['treatment_worked'] ?? '') === 'worsened') {
            return true;
        }

        // 2. Check patient notes for severe/worsened keywords
        $notes = strtolower($data['patient_notes'] ?? '');
        if (str_contains($notes, 'severe') || str_contains($notes, 'worsened')) {
            return true;
        }

        // 3. Check side effects array for severe reactions
        $sideEffects = $data['side_effects'] ?? [];
        foreach ($sideEffects as $effect) {
            if (is_string($effect)) {
                $effectText = strtolower($effect);
                if (str_contains($effectText, 'severe') || str_contains($effectText, 'worsened')) {
                    return true;
                }
            }
        }

        return false;
    }
}
