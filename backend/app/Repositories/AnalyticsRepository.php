<?php

namespace App\Repositories;

use App\Models\Appointment;
use App\Models\Encounter;
use App\Models\Outcome;
use App\Repositories\Contracts\AnalyticsRepositoryInterface;
use Carbon\Carbon;

class AnalyticsRepository implements AnalyticsRepositoryInterface
{
    public function getCompletedEncountersCount(int $doctorId): int
    {
        return Encounter::where('doctor_id', $doctorId)
            ->where('status', 'completed')
            ->count();
    }

    public function getAverageEncounterDuration(int $doctorId): float
    {
        $encounters = Encounter::where('doctor_id', $doctorId)
            ->where('status', 'completed')
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get();

        if ($encounters->isEmpty()) {
            return 0.0;
        }

        $totalSeconds = 0;
        foreach ($encounters as $encounter) {
            $totalSeconds += abs($encounter->completed_at->diffInSeconds($encounter->started_at));
        }

        return $totalSeconds / $encounters->count();
    }

    public function getAppointmentsCountByDate(string $date): int
    {
        return Appointment::whereDate('appointment_date', $date)->count();
    }

    public function getNoShowCountByDate(string $date): int
    {
        return Appointment::whereDate('appointment_date', $date)
            ->where('status', 'no_show')
            ->count();
    }

    public function getAverageWaitingTimeByDate(string $date): float
    {
        $encounters = Encounter::whereDate('encounter_date', $date)
            ->whereNotNull('started_at')
            ->whereHas('appointment')
            ->with('appointment')
            ->get();

        $totalWaitSeconds = 0;
        $count = 0;

        foreach ($encounters as $encounter) {
            if ($encounter->appointment) {
                // Combine date and time
                $scheduledTime = Carbon::parse(
                    $encounter->appointment->appointment_date->format('Y-m-d') . ' ' . $encounter->appointment->appointment_time
                );
                
                if ($encounter->started_at->greaterThan($scheduledTime)) {
                    $totalWaitSeconds += abs($encounter->started_at->diffInSeconds($scheduledTime));
                    $count++;
                }
            }
        }

        return $count > 0 ? ($totalWaitSeconds / $count) : 0.0;
    }

    public function getOutcomeSummary(): array
    {
        $total = Outcome::count();
        $improved = Outcome::where('treatment_worked', 'improved')->count();
        $escalated = Outcome::where('ai_outcome_label', 'escalated')->count();

        return [
            'total' => $total,
            'improved' => $improved,
            'escalated' => $escalated,
        ];
    }
}
