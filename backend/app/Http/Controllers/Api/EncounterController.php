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
     * Display active encounters for the authenticated doctor.
     */
    public function index(Request $request): JsonResponse
    {
        $doctor = Doctor::where('user_id', Auth::id())->first();
        
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        $encounters = $this->encounterService->getActiveEncountersForDoctor($doctor->id);

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

        $encounter->load(['patient', 'doctor.user', 'soapNote', 'symptom']);

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

    /**
     * Fetch context-aware flattened data block for AI engine consumption.
     */
    public function getContext(Request $request, int $id): JsonResponse
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== 'super-secret-token') {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        // 1. Fetch Encounter, Patient, Symptom, SoapNote, and Allergies
        $encounter = \App\Models\Encounter::with([
            'patient.allergies',
            'soapNote',
            'symptom',
            'appointment'
        ])->find($id);

        if (!$encounter) {
            return response()->json(['success' => false, 'message' => 'Encounter not found.'], 404);
        }

        $patient = $encounter->patient;
        $appointment = $encounter->appointment;
        $symptom = $encounter->symptom;
        $soapNote = $encounter->soapNote;

        // 2. Flatten JSON Payload into structured context string
        // [PATIENT_PROFILE]
        $demographics = "Name: {$patient->name}, Age: {$patient->age}, Gender: {$patient->gender}";
        if ($appointment && $appointment->triage_level) {
            $demographics .= ", Triage Level: {$appointment->triage_level}";
        }
        if ($symptom && isset($symptom->symptoms['vitals'])) {
            $v = $symptom->symptoms['vitals'];
            $demographics .= ", Vitals: [BP: " . ($v['bp'] ?? 'N/A') . ", HR: " . ($v['hr'] ?? 'N/A') . ", Temp: " . ($v['temp'] ?? 'N/A') . ", SpO2: " . ($v['spo2'] ?? 'N/A') . "]";
        }
        
        // [CLINICAL_FINDINGS]
        $positives = [];
        $negatives = [];
        if ($symptom && isset($symptom->symptoms['questions'])) {
            foreach ($symptom->symptoms['questions'] as $q) {
                $ans = $q['answer'] ?? '';
                if (!empty($ans)) {
                    if (str_starts_with(strtolower($ans), 'yes') || str_contains(strtolower($ans), 'present') || str_contains(strtolower($ans), 'confirmed')) {
                        $positives[] = "{$q['text']} ({$ans})";
                    } else {
                        $negatives[] = "{$q['text']} ({$ans})";
                    }
                }
            }
        }
        $findings = "Positives: " . (count($positives) > 0 ? implode(', ', $positives) : 'None') . " | Negatives: " . (count($negatives) > 0 ? implode(', ', $negatives) : 'None');

        // [CLINICAL_JUDGEMENT]
        $judgement = "None drafted.";
        if ($soapNote) {
            $judgement = "Subjective: {$soapNote->subjective} | Objective: {$soapNote->objective} | Assessment: {$soapNote->assessment} | Plan: {$soapNote->plan}";
        }

        // [IMPORTANT_ALERTS]
        $alerts = "No known allergies or pre-existing conditions.";
        if ($patient->allergies && $patient->allergies->count() > 0) {
            $alertsList = [];
            foreach ($patient->allergies as $allergy) {
                $alertsList[] = "Allergen: {$allergy->allergen} (Severity: " . ($allergy->severity ?? 'Unknown') . ", Reaction: " . ($allergy->reaction ?? 'None') . ")";
            }
            $alerts = implode('; ', $alertsList);
        }

        $contextString = implode("\n\n", [
            "[PATIENT_PROFILE]: {$demographics}",
            "[CLINICAL_FINDINGS]: {$findings}",
            "[CLINICAL_JUDGEMENT]: {$judgement}",
            "[IMPORTANT_ALERTS]: {$alerts}"
        ]);

        return response()->json([
            'success' => true,
            'context' => $contextString
        ]);
    }
}
