<?php

namespace App\Repositories\Contracts;

interface AnalyticsRepositoryInterface
{
    public function getCompletedEncountersCount(int $doctorId): int;

    public function getAverageEncounterDuration(int $doctorId): float;

    public function getAppointmentsCountByDate(string $date): int;

    public function getNoShowCountByDate(string $date): int;

    public function getAverageWaitingTimeByDate(string $date): float;

    public function getOutcomeSummary(): array;
}
