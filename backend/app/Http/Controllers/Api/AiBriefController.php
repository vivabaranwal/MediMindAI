<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiBriefService;
use Illuminate\Http\JsonResponse;

class AiBriefController extends Controller
{
    protected AiBriefService $aiBriefService;

    public function __construct(AiBriefService $aiBriefService)
    {
        $this->aiBriefService = $aiBriefService;
    }

    /**
     * Display AI Doctor Brief by Encounter ID.
     */
    public function show(int $encounterId): JsonResponse
    {
        $brief = $this->aiBriefService->getBriefForEncounter($encounterId);

        if (!$brief) {
            return response()->json([
                'success' => false,
                'message' => 'AI Brief not found for this encounter.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $brief,
        ]);
    }

    /**
     * Trigger regeneration of the doctor brief.
     */
    public function regenerate(int $encounterId): JsonResponse
    {
        try {
            $brief = $this->aiBriefService->regenerateBrief($encounterId);

            return response()->json([
                'success' => true,
                'message' => 'AI Brief regenerated successfully.',
                'data' => $brief,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
