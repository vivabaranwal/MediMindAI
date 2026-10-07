<?php

namespace App\Services;

use App\Models\AiBrief;
use App\Models\Encounter;
use App\Repositories\Contracts\AiBriefRepositoryInterface;
use App\Services\Ai\ConsentService;
use App\Services\Ai\EncounterContextBuilder;

class AiBriefService
{
    public function __construct(
        protected AiBriefRepositoryInterface $aiBriefRepository,
        protected AIGatewayService $ai,
        protected EncounterContextBuilder $context,
        protected ConsentService $consent,
    ) {
    }

    /** The stored brief, or null if none has been generated yet. Never generates. */
    public function getBriefForEncounter(int $encounterId): ?AiBrief
    {
        return $this->aiBriefRepository->findByEncounterId($encounterId);
    }

    /**
     * Generate (or regenerate) the brief from the encounter's current data.
     *
     * @throws \App\Exceptions\AiConsentRequiredException
     * @throws \App\Exceptions\AiServiceException  nothing is stored if the AI call fails
     */
    public function generate(int $encounterId): AiBrief
    {
        $encounter = Encounter::with('patient')->findOrFail($encounterId);
        $this->consent->assertAiConsent($encounter->patient);

        $result = $this->ai->brief($this->context->forEncounter($encounter));
        $meta = $result['meta'];

        $data = [
            'encounter_id' => $encounter->id,
            'patient_id' => $encounter->patient_id,
            'doctor_id' => $encounter->doctor_id,
            'brief_text' => $result['brief'],
            'suggested_questions' => $result['suggested_questions'],
            'risk_level' => $result['risk_level'],
            'risk_rationale' => $result['risk_rationale'],
            'red_flags' => $result['red_flags'],
            'similar_cases' => [], // similar-case matching is not implemented; stored empty, never invented
            'llm_model_used' => $meta['model'],
            'token_count' => ($meta['input_tokens'] ?? 0) + ($meta['output_tokens'] ?? 0),
            'generation_time_ms' => $meta['latency_ms'],
            'reviewed_by_doctor' => false,
        ];

        $existing = $this->aiBriefRepository->findByEncounterId($encounterId);
        if ($existing) {
            $this->aiBriefRepository->update($existing->id, $data);
            return $existing->fresh();
        }

        return $this->aiBriefRepository->create($data);
    }
}
