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
        $this->authorizePatientScope($request, (int) $request->input('patient_id'));

        abort_unless(
            \App\Models\Encounter::where('id', $request->input('encounter_id'))->where('patient_id', $request->input('patient_id'))->exists(),
            422,
            'The encounter does not belong to this patient.'
        );

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

        $this->authorizePatientScope($request, (int) $request->query('patient_id'));

        $outcomes = $this->outcomeService->getOutcomesForPatient($request->query('patient_id'));

        return response()->json([
            'success' => true,
            'data' => $outcomes,
        ]);
    }

    /**
     * A user with only the patient role may act on their own patient record, nobody else's.
     */
    private function authorizePatientScope(Request $request, int $patientId): void
    {
        $user = $request->user();
        if ($user->hasAnyRole(['doctor', 'super_admin', 'clinic_admin'])) {
            return;
        }

        $own = \App\Models\Patient::where('user_id', $user->id)->value('id');
        abort_if($own === null || (int) $own !== $patientId, 403, 'You can only access your own records.');
    }
}
