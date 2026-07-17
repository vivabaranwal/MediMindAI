<?php

namespace App\Services;

use App\Models\AiBrief;
use App\Models\Encounter;
use App\Repositories\Contracts\AiBriefRepositoryInterface;
use Illuminate\Support\Facades\Log;

class AiBriefService
{
    protected AiBriefRepositoryInterface $aiBriefRepository;
    protected AIGatewayService $aiGatewayService;

    public function __construct(
        AiBriefRepositoryInterface $aiBriefRepository,
        AIGatewayService $aiGatewayService
    ) {
        $this->aiBriefRepository = $aiBriefRepository;
        $this->aiGatewayService = $aiGatewayService;
    }

    /**
     * Fetch AI Brief by Encounter ID.
     */
    public function getBriefForEncounter(int $encounterId): ?AiBrief
    {
        $brief = $this->aiBriefRepository->findByEncounterId($encounterId);
        if (!$brief) {
            try {
                return $this->regenerateBrief($encounterId);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("On-the-fly brief generation failed: " . $e->getMessage());
            }
        }
        return $brief;
    }

    /**
     * Regenerate AI Doctor Brief via AI Gateway.
     */
    public function regenerateBrief(int $encounterId): AiBrief
    {
        $encounter = Encounter::find($encounterId);
        if (!$encounter) {
            throw new \Exception('Encounter not found.');
        }

        // Invoke external Vision/OCR brief generation
        $aiResponse = $this->aiGatewayService->generateDoctorBrief($encounterId);

        $briefData = [
            'encounter_id' => $encounterId,
            'patient_id' => $encounter->patient_id,
            'doctor_id' => $encounter->doctor_id,
            'brief_text' => $aiResponse['brief'] ?? 'AI brief draft text',
            'suggested_questions' => $aiResponse['suggested_questions'] ?? [],
            'risk_level' => $aiResponse['risk_level'] ?? 'green',
            'similar_cases' => $aiResponse['similar_cases'] ?? [],
            'llm_model_used' => $aiResponse['model_used'] ?? 'gemini-1.5-pro',
            'token_count' => $aiResponse['tokens_used'] ?? 0,
            'generation_time_ms' => $aiResponse['generation_time_ms'] ?? 500,
            'reviewed_by_doctor' => false,
        ];

        $existingBrief = $this->aiBriefRepository->findByEncounterId($encounterId);

        if ($existingBrief) {
            $this->aiBriefRepository->update($existingBrief->id, $briefData);
            $aiBrief = $existingBrief->fresh();
        } else {
            $aiBrief = $this->aiBriefRepository->create($briefData);
        }

        return $aiBrief;
    }
}
