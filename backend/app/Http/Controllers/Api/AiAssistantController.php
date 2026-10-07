<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Ai\AssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thin HTTP layer: validate, delegate, wrap. Consent checks and AI errors are handled
 * in the service/exceptions, not here.
 */
class AiAssistantController extends Controller
{
    private const VITALS = [
        'vitals' => ['nullable', 'array'],
        'vitals.bp' => ['nullable', 'string', 'max:20'],
        'vitals.hr' => ['nullable'],
        'vitals.temp' => ['nullable'],
        'vitals.spo2' => ['nullable'],
    ];

    public function __construct(private AssistantService $assistant)
    {
    }

    public function intakeQuestions(Request $request, int $appointmentId): JsonResponse
    {
        $input = $request->validate([
            'chief_complaint' => ['required', 'string', 'min:2', 'max:2000'],
            'answered' => ['nullable', 'array', 'max:60'],
            'answered.*.question' => ['required', 'string', 'max:1000'],
            'answered.*.answer' => ['nullable', 'string', 'max:2000'],
            'max_questions' => ['nullable', 'integer', 'min:1', 'max:10'],
        ] + self::VITALS);

        return response()->json(['success' => true, 'data' => $this->assistant->intakeQuestions($appointmentId, $input)]);
    }

    public function intakeSummary(Request $request, int $appointmentId): JsonResponse
    {
        $input = $request->validate([
            'chief_complaint' => ['required', 'string', 'min:2', 'max:2000'],
            'qa' => ['nullable', 'array', 'max:60'],
            'qa.*.question' => ['required', 'string', 'max:1000'],
            'qa.*.answer' => ['nullable', 'string', 'max:2000'],
        ] + self::VITALS);

        return response()->json(['success' => true, 'data' => $this->assistant->intakeSummary($appointmentId, $input)]);
    }

    public function suggestions(int $encounterId): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->assistant->suggestions($encounterId)]);
    }

    public function checkPrescription(Request $request): JsonResponse
    {
        $input = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'diagnosis' => ['nullable', 'string', 'max:500'],
            'medications' => ['required', 'array', 'min:1', 'max:30'],
            'medications.*.name' => ['required', 'string', 'max:200'],
            'medications.*.dosage' => ['nullable', 'string', 'max:100'],
            'medications.*.frequency' => ['nullable', 'string', 'max:100'],
            'medications.*.duration' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->assistant->checkPrescription($input['patient_id'], $input['medications'], $input['diagnosis'] ?? null),
        ]);
    }

    public function chat(Request $request, int $encounterId): JsonResponse
    {
        $input = $request->validate([
            'query' => ['required', 'string', 'min:1', 'max:2000'],
            'history' => ['nullable', 'array', 'max:40'],
            'history.*.role' => ['required', 'string', 'in:user,assistant'],
            'history.*.content' => ['required', 'string', 'max:4000'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->assistant->chat($encounterId, $input['query'], $input['history'] ?? []),
        ]);
    }
}
