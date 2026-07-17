<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    protected PatientService $patientService;

    public function __construct(PatientService $patientService)
    {
        $this->patientService = $patientService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->has('search')) {
            $patients = $this->patientService->searchPatients($request->query('search'));
        } else {
            $patients = $this->patientService->getAllPatients();
        }

        return response()->json([
            'success' => true,
            'data' => $patients,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePatientRequest $request): JsonResponse
    {
        $patient = $this->patientService->onboardPatient($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Patient registered successfully.',
            'data' => $patient,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        $patient = $this->patientService->getPatientProfile($id);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $patient,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePatientRequest $request, int $id): JsonResponse
    {
        $updated = $this->patientService->updatePatientProfile($id, $request->validated());

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found or profile could not be updated.',
            ], 404);
        }

        $patient = $this->patientService->getPatientProfile($id);

        return response()->json([
            'success' => true,
            'message' => 'Patient profile updated successfully.',
            'data' => $patient,
        ]);
    }
}
