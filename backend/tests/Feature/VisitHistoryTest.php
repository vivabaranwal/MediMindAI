<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Front-desk visit history, the signed prescription per visit, the encounter list with completed
 * cases, and the doctor level exposed to the portals.
 */
class VisitHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function user(UserRole $role, string $tag): User
    {
        $u = User::create([
            'name' => ucfirst($role->value) . ' ' . $tag, 'email' => "{$role->value}{$tag}@medimind.test",
            'mobile' => '+9120' . random_int(100000, 999999), 'password' => bcrypt('a-strong-password'),
            'role' => $role->value, 'status' => 'active',
        ]);
        $u->assignRole($role->value);
        return $u;
    }

    private function doctor(string $tag, string $level = 'senior'): array
    {
        $u = $this->user(UserRole::Doctor, $tag);
        return [$u, Doctor::create(['user_id' => $u->id, 'registration_number' => "REG{$tag}", 'specialization' => 'ENT', 'level' => $level, 'is_active' => true])];
    }

    private function visit(Patient $patient, Doctor $doctor, string $date, string $status = 'completed', string $time = '09:00:00'): Appointment
    {
        return Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'appointment_date' => $date, 'appointment_time' => $time,
            'slot_token' => 1, 'type' => 'walk_in', 'status' => $status, 'triage_level' => 'amber', 'chief_complaint' => 'Ear pain',
        ]);
    }

    private function signedPrescription(Appointment $appt, Doctor $doctor, bool $signed = true): Prescription
    {
        $enc = Encounter::create([
            'appointment_id' => $appt->id, 'patient_id' => $appt->patient_id, 'doctor_id' => $doctor->id,
            'encounter_date' => $appt->appointment_date, 'status' => 'completed', 'started_at' => now(),
        ]);

        return Prescription::create([
            'encounter_id' => $enc->id, 'patient_id' => $appt->patient_id, 'doctor_id' => $doctor->id,
            'medicines' => [['name' => 'Ciprofloxacin drops', 'dosage' => '3 drops', 'frequency' => 'Twice daily (BD)', 'duration' => '7 days', 'instructions' => '']],
            'diagnosis' => 'Acute otitis externa', 'instructions' => 'Keep the ear dry',
            'doctor_approved' => $signed, 'approved_at' => $signed ? now() : null,
        ]);
    }

    public function test_history_lists_visits_in_range_newest_first_with_signed_prescription_flag(): void
    {
        [, $doc] = $this->doctor('a');
        $asha = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000101']);
        $ravi = Patient::create(['name' => 'Ravi Kumar', 'mobile' => '+919800000102']);

        $first = $this->visit($asha, $doc, '2026-10-05');
        $second = $this->visit($ravi, $doc, '2026-10-07', 'completed', '10:00:00');
        $this->visit($asha, $doc, '2026-09-20'); // outside the range
        $this->signedPrescription($second, $doc);

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'desk'));
        $res = $this->getJson('/api/appointments/history?from=2026-10-01&to=2026-10-31')->assertOk();

        $res->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $second->id)->assertJsonPath('data.0.date', '2026-10-07')
            ->assertJsonPath('data.0.patient.name', 'Ravi Kumar')->assertJsonPath('data.0.prescription.id', Prescription::first()->id)
            ->assertJsonPath('data.1.id', $first->id)->assertJsonPath('data.1.prescription', null);
    }

    public function test_history_searches_by_patient_name_and_rejects_bad_ranges(): void
    {
        [, $doc] = $this->doctor('a');
        $this->visit(Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000101']), $doc, '2026-10-05');
        $this->visit(Patient::create(['name' => 'Ravi Kumar', 'mobile' => '+919800000102']), $doc, '2026-10-05');

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'desk'));
        $this->getJson('/api/appointments/history?from=2026-10-01&to=2026-10-31&q=asha')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/appointments/history?from=2026-10-01&to=2026-10-31&q=zzz')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/appointments/history?from=2026-10-10&to=2026-10-01')->assertStatus(422);
        $this->getJson('/api/appointments/history?from=2024-01-01&to=2026-10-01')->assertStatus(422);
    }

    public function test_front_desk_sees_only_signed_prescriptions_and_patients_see_none(): void
    {
        [, $doc] = $this->doctor('a');
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000101']);
        $signedVisit = $this->visit($patient, $doc, '2026-10-05');
        $draftVisit = $this->visit($patient, $doc, '2026-10-06');
        $this->signedPrescription($signedVisit, $doc);
        $this->signedPrescription($draftVisit, $doc, false);

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'desk'));
        $this->getJson("/api/appointments/{$signedVisit->id}/prescription")->assertOk()
            ->assertJsonPath('data.diagnosis', 'Acute otitis externa')
            ->assertJsonPath('data.chief_complaint', 'Ear pain')
            ->assertJsonPath('data.medicines.0.name', 'Ciprofloxacin drops')
            ->assertJsonPath('data.patient.name', 'Asha Verma');
        $this->getJson("/api/appointments/{$draftVisit->id}/prescription")->assertStatus(404);

        Sanctum::actingAs($this->user(UserRole::Patient, 'p'));
        $this->getJson("/api/appointments/{$signedVisit->id}/prescription")->assertStatus(403);
        $this->getJson('/api/appointments/history?from=2026-10-01&to=2026-10-31')->assertStatus(403);
    }

    public function test_encounter_list_can_include_completed_cases_and_detail_includes_the_appointment(): void
    {
        [$docUser, $doc] = $this->doctor('a');
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000101']);
        $done = $this->visit($patient, $doc, now()->toDateString());
        $this->signedPrescription($done, $doc);
        $doneEncounter = Encounter::where('appointment_id', $done->id)->first();
        $doneEncounter->update(['completed_at' => now()]);

        Sanctum::actingAs($docUser);
        $this->getJson('/api/encounters')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/encounters?completed=today')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.patient.name', 'Asha Verma');
        $this->getJson('/api/encounters?completed=all')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/encounters?completed=nonsense')->assertStatus(422);

        // The page needs the appointment for the token, triage level and complaint.
        $this->getJson("/api/encounters/{$doneEncounter->id}")->assertOk()
            ->assertJsonPath('data.appointment.chief_complaint', 'Ear pain')
            ->assertJsonPath('data.appointment.triage_level', 'amber');
    }

    public function test_login_and_user_endpoint_expose_the_doctor_level(): void
    {
        [$junior, ] = $this->doctor('j', 'junior');
        [$senior, ] = $this->doctor('s', 'senior');

        $this->postJson('/api/auth/login', ['email' => $junior->email, 'password' => 'a-strong-password'])
            ->assertOk()->assertJsonPath('user.doctor_level', 'junior');

        Sanctum::actingAs($senior);
        $this->getJson('/api/user')->assertOk()->assertJsonPath('doctor_level', 'senior');

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));
        $this->getJson('/api/user')->assertOk()->assertJsonPath('doctor_level', null);
    }
}
