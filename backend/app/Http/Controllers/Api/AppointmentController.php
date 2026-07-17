<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentStatusRequest;
use App\Http\Requests\UpdateAppointmentAssessmentRequest;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AppointmentController extends Controller
{
    protected AppointmentService $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
    }

    /**
     * Store a newly created appointment.
     *
     * POST /api/appointments
     */
    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->appointmentService->bookAppointment(
            $request->validated(),
            Auth::id()
        );

        return response()->json([
            'success' => true,
            'message' => 'Appointment booked successfully.',
            'data' => $appointment,
        ], 201);
    }

    /**
     * Get the daily consultation queue for a doctor.
     * 
     * GET /api/appointments/queue
     */
    public function queue(Request $request): JsonResponse
    {
        \Illuminate\Support\Facades\Log::info('[AppointmentController] Queue request received', $request->all());

        $request->validate([
            'doctor_id' => ['required', 'integer', 'exists:doctors,id'],
            'date' => ['nullable', 'date'],
        ]);

        $doctorId = $request->query('doctor_id');
        $date = $request->query('date');

        $queue = $this->appointmentService->getDailyQueue($doctorId, $date);

        \Illuminate\Support\Facades\Log::info('[AppointmentController] Daily queue retrieved', [
            'doctor_id' => $doctorId,
            'count' => count($queue)
        ]);

        return response()->json([
            'success' => true,
            'data' => $queue,
        ]);
    }

    /**
     * Update the status of an appointment.
     * 
     * PATCH /api/appointments/{id}/status
     */
    public function updateStatus(UpdateAppointmentStatusRequest $request, int $id): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->updateStatus(
                $id,
                $request->input('status'),
                $request->input('cancel_reason')
            );

            return response()->json([
                'success' => true,
                'message' => "Appointment status updated to '{$request->input('status')}' successfully.",
                'data' => $appointment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Cancel an appointment.
     * 
     * POST /api/appointments/{id}/cancel
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'cancel_reason' => ['nullable', 'string'],
        ]);

        try {
            $appointment = $this->appointmentService->updateStatus(
                $id,
                'cancelled',
                $request->input('cancel_reason')
            );

            return response()->json([
                'success' => true,
                'message' => 'Appointment cancelled successfully.',
                'data' => $appointment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Complete an appointment.
     * 
     * POST /api/appointments/{id}/complete
     */
    public function complete(int $id): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->updateStatus($id, 'completed');

            return response()->json([
                'success' => true,
                'message' => 'Appointment completed successfully.',
                'data' => $appointment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Save clinical assessment details and dispatch.
     * 
     * POST /api/appointments/{id}/assessment
     */
    public function saveAssessment(UpdateAppointmentAssessmentRequest $request, int $id): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->saveAssessment(
                $id,
                $request->validated()
            );

            return response()->json([
                'success' => true,
                'message' => 'Clinical assessment saved and patient case dispatched successfully.',
                'data' => $appointment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
