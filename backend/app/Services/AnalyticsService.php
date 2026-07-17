<?php

namespace App\Services;

use App\Repositories\Contracts\AnalyticsRepositoryInterface;

class AnalyticsService
{
    protected AnalyticsRepositoryInterface $analyticsRepository;

    public function __construct(AnalyticsRepositoryInterface $analyticsRepository)
    {
        $this->analyticsRepository = $analyticsRepository;
    }

    public function getDoctorMetrics(int $doctorId): array
    {
        $completedEncounters = $this->analyticsRepository->getCompletedEncountersCount($doctorId);
        $avgDurationSeconds = $this->analyticsRepository->getAverageEncounterDuration($doctorId);
        
        return [
            'completed_encounters_count' => $completedEncounters,
            'average_consultation_duration_minutes' => round($avgDurationSeconds / 60, 2),
        ];
    }

    public function getClinicMetrics(): array
    {
        $today = date('Y-m-d');
        $totalAppointments = $this->analyticsRepository->getAppointmentsCountByDate($today);
        $noShowCount = $this->analyticsRepository->getNoShowCountByDate($today);
        $avgWaitSeconds = $this->analyticsRepository->getAverageWaitingTimeByDate($today);

        $noShowRate = $totalAppointments > 0 ? round(($noShowCount / $totalAppointments) * 100, 2) : 0.0;

        return [
            'total_appointments_today' => $totalAppointments,
            'average_waiting_time_minutes' => round($avgWaitSeconds / 60, 2),
            'no_show_rate_percentage' => $noShowRate,
        ];
    }

    public function getOutcomeTrends(): array
    {
        $summary = $this->analyticsRepository->getOutcomeSummary();
        $total = $summary['total'];
        $improved = $summary['improved'];
        $escalated = $summary['escalated'];

        $recoveryRate = $total > 0 ? round(($improved / $total) * 100, 2) : 0.0;
        $escalationRate = $total > 0 ? round(($escalated / $total) * 100, 2) : 0.0;

        return [
            'total_outcomes' => $total,
            'recovery_rate_percentage' => $recoveryRate,
            'escalation_rate_percentage' => $escalationRate,
        ];
    }
}
