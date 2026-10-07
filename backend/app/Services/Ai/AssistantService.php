<?php

namespace App\Services\Ai;

use App\Models\Appointment;
use App\Models\Encounter;
use App\Models\Patient;
use App\Exceptions\AiConsentRequiredException;
use App\Exceptions\AiServiceException;
use App\Services\AIGatewayService;
use App\Services\Clinical\DrugAllergyChecker;

/**
 * Doctor-facing AI features that are not persisted records: intake questioning,
 * decision-support suggestions, prescription checks and grounded patient chat.
 * Every method enforces patient AI consent before any data leaves Laravel.
 */
class AssistantService
{
    public function __construct(
        private AIGatewayService $ai,
        private EncounterContextBuilder $context,
        private ConsentService $consent,
        private DrugAllergyChecker $allergies,
    ) {
    }

    // ------------------------------------------------------- junior doctor intake

    public function intakeQuestions(int $appointmentId, array $input): array
    {
        $appointment = Appointment::with('patient.allergies')->findOrFail($appointmentId);
        $this->consent->assertAiConsent($appointment->patient);

        return $this->ai->intakeQuestions([
            'chief_complaint' => $input['chief_complaint'],
            'patient' => $this->context->patientFacts($appointment->patient),
            'vitals' => $this->context->normalizeVitals($input['vitals'] ?? null),
            'answered' => $this->cleanQa($input['answered'] ?? []),
            'max_questions' => $input['max_questions'] ?? 6,
        ]);
    }

    public function intakeSummary(int $appointmentId, array $input): array
    {
        $appointment = Appointment::with('patient.allergies')->findOrFail($appointmentId);
        $this->consent->assertAiConsent($appointment->patient);

        return $this->ai->intakeSummary([
            'chief_complaint' => $input['chief_complaint'],
            'patient' => $this->context->patientFacts($appointment->patient),
            'vitals' => $this->context->normalizeVitals($input['vitals'] ?? null),
            'qa' => $this->cleanQa($input['qa'] ?? []),
        ]);
    }

    // --------------------------------------------------------- senior doctor

    public function suggestions(int $encounterId): array
    {
        $encounter = Encounter::with('patient')->findOrFail($encounterId);
        $this->consent->assertAiConsent($encounter->patient);

        $result = $this->ai->suggestions($this->context->forEncounter($encounter));

        $allergies = $this->context->patientFacts($encounter->patient)['allergies'];
        $result['medications'] = array_map(
            fn ($m) => $m + ['alerts' => $this->allergies->check($m['name'], $allergies)],
            $result['medications'] ?? []
        );

        return $result;
    }

    /**
     * Safety check for a draft prescription.
     *
     * Allergy contraindications are deterministic and always evaluated here. The model's
     * interaction/dosing review is advisory: if the patient has not consented or the engine
     * is down, the rule alerts are still returned and `model_check` says why it was skipped.
     */
    public function checkPrescription(int $patientId, array $medications, ?string $diagnosis): array
    {
        $patient = Patient::with('allergies')->findOrFail($patientId);
        $facts = $this->context->patientFacts($patient);
        $names = array_column($medications, 'name');

        $alerts = $this->allergies->checkAll($names, $facts['allergies']);
        $modelCheck = ['status' => 'ok', 'reason' => null];

        try {
            $this->consent->assertAiConsent($patient);
            $result = $this->ai->checkPrescription([
                'medications' => array_map(fn ($m) => array_filter([
                    'name' => $m['name'],
                    'dosage' => $m['dosage'] ?? null,
                    'frequency' => $m['frequency'] ?? null,
                    'duration' => $m['duration'] ?? null,
                ], fn ($v) => $v !== null), $medications),
                'patient' => $facts,
                'diagnosis' => $diagnosis,
            ]);
            $alerts = array_merge($alerts, $result['alerts']);
        } catch (AiConsentRequiredException) {
            $modelCheck = ['status' => 'skipped', 'reason' => 'ai_consent_required'];
        } catch (AiServiceException $e) {
            $modelCheck = ['status' => 'unavailable', 'reason' => $e->errorCode];
        }

        $order = ['critical' => 0, 'warning' => 1, 'info' => 2];
        usort($alerts, fn ($a, $b) => $order[$a['severity']] <=> $order[$b['severity']]);

        return ['alerts' => $alerts, 'model_check' => $modelCheck];
    }

    public function chat(int $encounterId, string $query, array $history): array
    {
        $encounter = Encounter::with('patient')->findOrFail($encounterId);
        $this->consent->assertAiConsent($encounter->patient);

        return $this->ai->chat([
            'patient_id' => $encounter->patient_id,
            'encounter_id' => $encounter->id,
            'query' => $query,
            'history' => $history,
            'chart_context' => $this->context->chartContext($encounter),
        ]);
    }

    private function cleanQa(array $items): array
    {
        return collect($items)
            ->map(fn ($i) => ['question' => (string) ($i['question'] ?? ''), 'answer' => trim((string) ($i['answer'] ?? ''))])
            ->filter(fn ($i) => $i['question'] !== '' && $i['answer'] !== '')
            ->values()->all();
    }
}
