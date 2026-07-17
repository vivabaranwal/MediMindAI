<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    protected AnalyticsService $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Fetch doctor performance metrics.
     * Doctors can only view their own performance. Admin roles can query any doctor.
     */
    public function doctor(Request $request): JsonResponse
    {
        $user = $request->user();
        $doctorId = $request->query('doctor_id');

        if ($user->hasRole('doctor')) {
            $doctor = \App\Models\Doctor::where('user_id', $user->id)->first();
            if (!$doctor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Doctor profile not found for this user.',
                ], 404);
            }
            
            // If doctor specified a different doctor_id in the query, deny it
            if ($doctorId && (int)$doctorId !== $doctor->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Doctors can only view their own metrics.',
                ], 403);
            }

            $doctorId = $doctor->id;
        } else {
            // Admin or super_admin must provide doctor_id
            if (!$doctorId) {
                return response()->json([
                    'success' => false,
                    'message' => 'The doctor_id parameter is required.',
                ], 422);
            }
        }

        $metrics = $this->analyticsService->getDoctorMetrics((int)$doctorId);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Fetch clinic-wide metrics.
     * Restricted to super_admin and clinic_admin.
     */
    public function clinic(Request $request): JsonResponse
    {
        $metrics = $this->analyticsService->getClinicMetrics();

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Fetch patient outcome trends.
     * Restricted to super_admin and clinic_admin.
     */
    public function outcomes(Request $request): JsonResponse
    {
        $metrics = $this->analyticsService->getOutcomeTrends();

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }
}
