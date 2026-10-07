<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Encounter;
use App\Models\Prescription;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only visit history for front-desk staff: which patient came when, who they saw,
 * and the signed prescription (never a draft) for each visit.
 */
class VisitHistoryController extends Controller
{
    private const MAX_DAYS = 366;

    /**
     * GET /api/appointments/history?from=YYYY-MM-DD&to=YYYY-MM-DD&q=
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        if (Carbon::parse($data['from'])->diffInDays(Carbon::parse($data['to'])) > self::MAX_DAYS) {
            return response()->json([
                'success' => false,
                'message' => 'Choose a range of one year or less.',
            ], 422);
        }

        $appointments = Appointment::with(['patient', 'doctor.user'])
            ->whereDate('appointment_date', '>=', $data['from'])
            ->whereDate('appointment_date', '<=', $data['to'])
            ->orderByDesc('appointment_date')
            ->orderByDesc('appointment_time')
            ->get();

        // Names are encrypted at rest, so the search runs here rather than in SQL.
        if ($q = mb_strtolower(trim($data['q'] ?? ''))) {
            $appointments = $appointments->filter(fn (Appointment $a) => str_contains(mb_strtolower((string) $a->patient?->name), $q)
                || str_contains(mb_strtolower((string) $a->patient?->patient_code), $q));
        }

        $encounterByAppointment = Encounter::whereIn('appointment_id', $appointments->pluck('id'))
            ->get()->groupBy('appointment_id')->map(fn ($g) => $g->sortByDesc('id')->first());

        $signedByEncounter = Prescription::whereIn('encounter_id', $encounterByAppointment->pluck('id'))
            ->where('doctor_approved', true)
            ->get()->groupBy('encounter_id')->map(fn ($g) => $g->sortByDesc('id')->first());

        $rows = $appointments->values()->map(function (Appointment $a) use ($encounterByAppointment, $signedByEncounter) {
            $rx = $signedByEncounter->get($encounterByAppointment->get($a->id)?->id);

            return [
                'id' => $a->id,
                'appointment_no' => $a->appointment_no,
                'date' => $a->appointment_date?->toDateString(),
                'time' => substr((string) $a->appointment_time, 0, 5),
                'status' => $a->status instanceof \BackedEnum ? $a->status->value : (string) $a->status,
                'type' => $a->type,
                'chief_complaint' => $a->chief_complaint,
                'patient' => [
                    'id' => $a->patient?->id,
                    'name' => $a->patient?->name,
                    'patient_code' => $a->patient?->patient_code,
                    'age' => $a->patient?->age,
                    'gender' => $a->patient?->gender,
                ],
                'doctor' => [
                    'id' => $a->doctor?->id,
                    'name' => $a->doctor?->user?->name,
                    'level' => $a->doctor?->level,
                ],
                'prescription' => $rx ? ['id' => $rx->id, 'approved_at' => $rx->approved_at?->toIso8601String()] : null,
            ];
        });

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /**
     * GET /api/appointments/{id}/prescription — the signed prescription for a visit.
     */
    public function prescription(int $id): JsonResponse
    {
        $appointment = Appointment::with('patient.allergies')->findOrFail($id);
        $encounter = Encounter::where('appointment_id', $appointment->id)->orderByDesc('id')->first();

        $rx = $encounter
            ? Prescription::with('doctor.user')
                ->where('encounter_id', $encounter->id)
                ->where('doctor_approved', true)
                ->orderByDesc('id')->first()
            : null;

        if (! $rx) {
            return response()->json([
                'success' => false,
                'message' => 'No signed prescription for this visit.',
            ], 404);
        }

        $patient = $appointment->patient;

        return response()->json([
            'success' => true,
            'data' => [
                'prescription_no' => $rx->prescription_no,
                'approved_at' => $rx->approved_at?->toIso8601String(),
                'followup_date' => $rx->followup_date?->toDateString(),
                'diagnosis' => $rx->diagnosis,
                'chief_complaint' => $appointment->chief_complaint,
                'instructions' => $rx->instructions,
                'medicines' => $rx->medicines ?? [],
                'doctor_name' => $rx->doctor?->user?->name,
                'patient' => [
                    'name' => $patient?->name,
                    'patient_code' => $patient?->patient_code,
                    'age' => $patient?->age,
                    'gender' => $patient?->gender,
                    'allergies' => $patient?->allergies?->pluck('allergen')->filter()->values()->all() ?? [],
                ],
            ],
        ]);
    }
}
