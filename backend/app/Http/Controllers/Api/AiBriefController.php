<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiBriefService;
use Illuminate\Http\JsonResponse;

class AiBriefController extends Controller
{
    public function __construct(protected AiBriefService $aiBriefService)
    {
    }

    /**
     * Stored AI doctor brief. 404 with code `brief_not_generated` until generated.
     */
    public function show(int $encounterId): JsonResponse
    {
        $brief = $this->aiBriefService->getBriefForEncounter($encounterId);

        if (!$brief) {
            return response()->json([
                'success' => false,
                'code' => 'brief_not_generated',
                'message' => 'No AI brief has been generated for this encounter yet.',
            ], 404);
        }

        return response()->json(['success' => true, 'data' => $brief]);
    }

    /**
     * Generate or regenerate the brief. AI/consent failures propagate as typed errors.
     */
    public function regenerate(int $encounterId): JsonResponse
    {
        $brief = $this->aiBriefService->generate($encounterId);

        return response()->json([
            'success' => true,
            'message' => 'AI brief generated.',
            'data' => $brief,
        ]);
    }
}
