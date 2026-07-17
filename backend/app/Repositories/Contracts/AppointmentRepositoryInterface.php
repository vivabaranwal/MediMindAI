<?php

namespace App\Repositories\Contracts;

use App\Models\Appointment;
use Illuminate\Support\Collection;

interface AppointmentRepositoryInterface
{
    public function all(): Collection;
    public function find(int $id): ?Appointment;
    public function create(array $data): Appointment;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function getTodayAppointmentsForDoctor(int $doctorId): Collection;
    public function getAvailableSlots(int $doctorId, string $date): array;
}
