<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOutcomeRequest;
use App\Services\OutcomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OutcomeController extends Controller
{
    protected OutcomeService $outcomeService;

    public function __construct(OutcomeService $outcomeService)
    {
        $this->outcomeService = $outcomeService;
    }

    /**
     * Submit a patient treatment outcome response.
     */
    public function store(StoreOutcomeRequest $request): JsonResponse
    {
        try {
            $outcome = $this->outcomeService->recordOutcome($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Outcome logged successfully.',
                'data' => $outcome,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display outcome listings history by patient.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
        ]);

        $outcomes = $this->outcomeService->getOutcomesForPatient($request->query('patient_id'));

        return response()->json([
            'success' => true,
            'data' => $outcomes,
        ]);
    }
}
