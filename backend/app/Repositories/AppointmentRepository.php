<?php

namespace App\Repositories;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Repositories\Contracts\AppointmentRepositoryInterface;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class AppointmentRepository implements AppointmentRepositoryInterface
{
    public function all(): Collection
    {
        return Appointment::all();
    }

    public function find(int $id): ?Appointment
    {
        return Appointment::find($id);
    }

    public function create(array $data): Appointment
    {
        return Appointment::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $appointment = $this->find($id);
        if ($appointment) {
            return $appointment->update($data);
        }
        return false;
    }

    public function delete(int $id): bool
    {
        $appointment = $this->find($id);
        if ($appointment) {
            return $appointment->delete();
        }
        return false;
    }

    public function getTodayAppointmentsForDoctor(int $doctorId): Collection
    {
        return Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', Carbon::today())
            ->orderBy('appointment_time', 'asc')
            ->get();
    }

    public function getAvailableSlots(int $doctorId, string $date): array
    {
        $doctor = Doctor::find($doctorId);
        if (!$doctor) {
            return [];
        }

        // Available days check (e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
        $dayOfWeek = Carbon::parse($date)->format('D');
        if (!in_array($dayOfWeek, $doctor->available_days ?? [])) {
            return [];
        }

        // Generate standard slots from 09:00 to 17:00 based on doctor slot duration
        $startTime = Carbon::parse('09:00');
        $endTime = Carbon::parse('17:00');
        $duration = $doctor->slot_duration_mins ?? 15;

        // Get booked times on this date
        $bookedTimes = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereIn('status', ['booked', 'confirmed', 'in_queue', 'in_consultation', 'completed'])
            ->pluck('appointment_time')
            ->map(fn($time) => Carbon::parse($time)->format('H:i'))
            ->toArray();

        $slots = [];
        while ($startTime->lt($endTime)) {
            $slotStr = $startTime->format('H:i');
            $slots[] = [
                'time' => $slotStr,
                'available' => !in_array($slotStr, $bookedTimes),
            ];
            $startTime->addMinutes($duration);
        }

        return $slots;
    }
}
