<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrescriptionRequest;
use App\Http\Requests\ApprovePrescriptionRequest;
use App\Services\PrescriptionService;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PrescriptionController extends Controller
{
    protected PrescriptionService $prescriptionService;

    public function __construct(PrescriptionService $prescriptionService)
    {
        $this->prescriptionService = $prescriptionService;
    }

    /**
     * Retrieve prescription draft/approved by encounter ID.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'encounter_id' => ['required', 'integer', 'exists:encounters,id'],
        ]);

        $prescription = $this->prescriptionService->getPrescriptionForEncounter($request->query('encounter_id'));

        if (!$prescription) {
            return response()->json([
                'success' => false,
                'message' => 'Prescription not found for this encounter.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $prescription,
        ]);
    }

    /**
     * Store draft prescription.
     */
    public function store(StorePrescriptionRequest $request): JsonResponse
    {
        $doctor = Doctor::where('user_id', Auth::id())->first();
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        try {
            $prescription = $this->prescriptionService->saveDraft(
                $request->input('encounter_id'),
                $request->validated(),
                $doctor->id
            );

            return response()->json([
                'success' => true,
                'message' => 'Prescription draft saved successfully.',
                'data' => $prescription,
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
     * Doctor approves prescription.
     */
    public function approve(ApprovePrescriptionRequest $request, int $id): JsonResponse
    {
        $doctor = Doctor::where('user_id', Auth::id())->first();
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        try {
            $approvedPrescription = $this->prescriptionService->approvePrescription($id, $doctor->id);

            return response()->json([
                'success' => true,
                'message' => 'Prescription approved successfully.',
                'data' => $approvedPrescription,
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
