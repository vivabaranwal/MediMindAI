<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EncounterService;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EncounterController extends Controller
{
    protected EncounterService $encounterService;

    public function __construct(EncounterService $encounterService)
    {
        $this->encounterService = $encounterService;
    }

    /**
     * Display encounters for the authenticated doctor: active by default, or with completed ones (?completed=today|all).
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['completed' => ['nullable', 'in:none,today,all']]);

        $doctor = Doctor::where('user_id', Auth::id())->first();
        
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        // Default stays "active only"; the senior dashboard asks for today's completed cases too.
        $encounters = $this->encounterService->getEncountersForDoctor($doctor->id, $request->query('completed', 'none'));

        return response()->json([
            'success' => true,
            'data' => $encounters,
        ]);
    }

    /**
     * Display encounter details.
     */
    public function show(int $id): JsonResponse
    {
        $encounter = $this->encounterService->getEncounter($id);

        if (!$encounter) {
            return response()->json([
                'success' => false,
                'message' => 'Encounter not found.',
            ], 404);
        }

        $encounter->load(['patient', 'doctor.user', 'soapNote', 'symptom', 'appointment']);

        return response()->json([
            'success' => true,
            'data' => $encounter,
        ]);
    }

    /**
     * Complete the encounter.
     */
    public function complete(int $id): JsonResponse
    {
        try {
            $encounter = $this->encounterService->completeEncounter($id);

            return response()->json([
                'success' => true,
                'message' => 'Encounter completed successfully.',
                'data' => $encounter,
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
