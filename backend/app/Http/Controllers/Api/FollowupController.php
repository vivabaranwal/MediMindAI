<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFollowupRequest;
use App\Services\FollowupService;
use App\Models\Encounter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowupController extends Controller
{
    protected FollowupService $followupService;

    public function __construct(FollowupService $followupService)
    {
        $this->followupService = $followupService;
    }

    /**
     * Schedule a new patient follow-up.
     */
    public function store(StoreFollowupRequest $request): JsonResponse
    {
        try {
            $encounter = Encounter::find($request->input('encounter_id'));
            if (!$encounter) {
                return response()->json([
                    'success' => false,
                    'message' => 'Encounter not found.',
                ], 404);
            }

            $followup = $this->followupService->createFollowup(
                $request->validated(),
                $encounter->doctor_id
            );

            return response()->json([
                'success' => true,
                'message' => 'Follow-up scheduled successfully.',
                'data' => $followup,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display listings of follow-ups by patient.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
        ]);

        $followups = $this->followupService->getFollowupsForPatient($request->query('patient_id'));

        return response()->json([
            'success' => true,
            'data' => $followups,
        ]);
    }
}
