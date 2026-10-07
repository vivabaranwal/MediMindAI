<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Allergy;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Report;
use App\Models\User;
use App\Services\Ai\ConsentService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicDirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function user(UserRole $role, string $tag, string $password = 'a-strong-password'): User
    {
        $u = User::create([
            'name' => ucfirst($role->value) . ' ' . $tag, 'email' => "{$role->value}{$tag}@medimind.test",
            'mobile' => '+9120' . random_int(100000, 999999), 'password' => bcrypt($password),
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

    public function test_doctor_login_and_user_endpoint_expose_the_doctor_id(): void
    {
        [$u, $d] = $this->doctor('a');

        $this->postJson('/api/auth/login', ['email' => $u->email, 'password' => 'a-strong-password'])
            ->assertOk()->assertJsonPath('user.doctor_id', $d->id);

        Sanctum::actingAs($u);
        $this->getJson('/api/user')->assertOk()->assertJsonPath('doctor_id', $d->id)->assertJsonMissingPath('password');

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));
        $this->getJson('/api/user')->assertOk()->assertJsonPath('doctor_id', null);
    }

    public function test_doctor_directory_lists_active_doctors_for_staff_only(): void
    {
        [, $d1] = $this->doctor('a');
        [, $d2] = $this->doctor('b');
        $d2->update(['is_active' => false]);

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));
        $this->getJson('/api/doctors')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $d1->id)->assertJsonPath('data.0.specialization', 'ENT')->assertJsonPath('data.0.level', 'senior');

        Sanctum::actingAs($this->user(UserRole::Patient, 'p'));
        $this->getJson('/api/doctors')->assertStatus(403);
    }

    public function test_queue_includes_doctor_name_and_patient_allergies(): void
    {
        [, $doctor] = $this->doctor('a');
        $desk = $this->user(UserRole::FrontDesk, 'f');
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000010']);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penicillin']);
        Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'appointment_date' => date('Y-m-d'), 'appointment_time' => '09:00:00',
            'slot_token' => 1, 'type' => 'regular', 'status' => 'booked', 'triage_level' => 'green', 'booked_by' => $desk->id,
        ]);
        Sanctum::actingAs($desk);

        $row = $this->getJson("/api/appointments/queue?doctor_id={$doctor->id}")->assertOk()->json('data.0');

        $this->assertSame($doctor->user->name, $row['doctor']['user']['name']);
        $this->assertSame('Penicillin', $row['patient']['allergies'][0]['allergen']);
    }

    public function test_patient_profile_includes_allergies_and_consent_state(): void
    {
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000011']);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Sulfa']);
        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));

        $this->getJson("/api/patients/{$patient->id}")->assertOk()
            ->assertJsonPath('data.allergies.0.allergen', 'Sulfa')->assertJsonPath('data.ai_consent', false);

        app(ConsentService::class)->record($patient, ConsentService::AI, true);
        $this->getJson("/api/patients/{$patient->id}")->assertJsonPath('data.ai_consent', true);
    }

    public function test_handoff_reassigns_the_case_to_the_chosen_senior_doctor(): void
    {
        [$juniorUser, $junior] = $this->doctor('j', 'junior');
        [, $senior] = $this->doctor('s');
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000012']);
        $appt = Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $junior->id, 'appointment_date' => date('Y-m-d'), 'appointment_time' => '09:00:00',
            'slot_token' => 1, 'type' => 'regular', 'status' => 'in_consultation', 'triage_level' => 'green', 'booked_by' => $juniorUser->id,
            'chief_complaint' => 'Ear pain',
        ]);
        Sanctum::actingAs($juniorUser);

        $this->postJson("/api/appointments/{$appt->id}/assessment", [
            'triage_level' => 'amber', 'chief_complaint' => 'Ear pain', 'doctor_id' => $senior->id,
            'vitals' => ['temp' => '99.5 °F'], 'symptoms' => [],
        ])->assertOk();

        $this->assertSame($senior->id, $appt->fresh()->doctor_id);
        $this->assertSame($senior->id, Encounter::where('appointment_id', $appt->id)->first()->doctor_id);

        $this->postJson("/api/appointments/{$appt->id}/assessment", [
            'triage_level' => 'amber', 'chief_complaint' => 'Ear pain', 'doctor_id' => 99999,
        ])->assertStatus(422);

        // Handoff goes to a senior only: not to another junior, and not chosen by the receptionist.
        [, $otherJunior] = $this->doctor('j2', 'junior');
        $this->postJson("/api/appointments/{$appt->id}/assessment", [
            'triage_level' => 'amber', 'chief_complaint' => 'Ear pain', 'doctor_id' => $otherJunior->id,
        ])->assertStatus(422);

        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'desk'));
        $this->postJson("/api/appointments/{$appt->id}/assessment", [
            'triage_level' => 'amber', 'chief_complaint' => 'Ear pain', 'doctor_id' => $senior->id,
        ])->assertStatus(403);
    }

    public function test_admin_overview_reports_real_counts_and_is_admin_only(): void
    {
        $admin = $this->user(UserRole::ClinicAdmin, 'a');
        $patient = Patient::create(['name' => 'P', 'mobile' => '+919800000013']);
        foreach (['analyzed', 'failed', 'not_analyzed'] as $i => $status) {
            Report::create(['patient_id' => $patient->id, 'report_type' => 'xray', 'file_name' => "r{$i}.pdf", 'file_path' => "r{$i}.pdf", 'status' => $status]);
        }

        Sanctum::actingAs($admin);
        $data = $this->getJson('/api/admin/overview')->assertOk()->json('data');
        $this->assertSame(1, $data['active_users']);
        $this->assertSame(1, $data['patients']);
        $this->assertSame(2, $data['reports_needing_attention']);
        $this->assertSame(1, $data['reports_by_status']['analyzed']);

        foreach ([UserRole::Doctor, UserRole::FrontDesk, UserRole::Patient] as $role) {
            Sanctum::actingAs($this->user($role, 'x' . $role->value));
            $this->getJson('/api/admin/overview')->assertStatus(403);
            $this->getJson('/api/admin/audit-logs')->assertStatus(403);
        }
    }

    public function test_audit_log_listing_returns_real_events_newest_first(): void
    {
        $admin = $this->user(UserRole::ClinicAdmin, 'a');
        AuditLog::create(['user_id' => $admin->id, 'action' => 'POST api/patients', 'resource_type' => 'Patient', 'resource_id' => 5, 'new_values' => ['name'], 'ip_address' => '10.0.0.1']);
        AuditLog::create(['user_id' => $admin->id, 'action' => 'PUT api/patients/5', 'resource_type' => 'Patient', 'resource_id' => 5, 'ip_address' => '10.0.0.1']);
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/audit-logs')->assertOk();
        $res->assertJsonPath('data.0.action', 'PUT api/patients/5')->assertJsonPath('data.1.fields.0', 'name')
            ->assertJsonPath('data.0.user', $admin->name)->assertJsonPath('meta.total', 2);
    }

    public function test_registration_captures_allergies_and_separate_consents(): void
    {
        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));

        $id = $this->postJson('/api/patients', [
            'name' => 'Ravi Kumar', 'mobile' => '+919800000031',
            'allergies' => [['allergen' => 'Penicillin', 'reaction' => 'rash', 'severity' => 'severe'], ['allergen' => 'Sulfa']],
            'data_consent' => true, 'ai_consent' => false,
        ])->assertStatus(201)->assertJsonCount(2, 'data.allergies')->json('data.id');

        $this->assertDatabaseHas('allergies', ['patient_id' => $id, 'severity' => 'severe']);
        $this->assertEqualsCanonicalizing(['Penicillin', 'Sulfa'], Patient::find($id)->allergies->pluck('allergen')->all());
        $this->assertDatabaseHas('patient_consents', ['patient_id' => $id, 'consent_type' => 'data_collection', 'consented' => true]);
        // Declining AI is recorded as a decision, and AI stays locked.
        $this->assertDatabaseHas('patient_consents', ['patient_id' => $id, 'consent_type' => 'ai_assistance', 'consented' => false]);
        $this->assertFalse(app(ConsentService::class)->hasAiConsent(Patient::find($id)));
    }

    public function test_allergy_list_can_be_replaced_and_is_validated(): void
    {
        $patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000032']);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Old allergen']);
        Sanctum::actingAs($this->user(UserRole::FrontDesk, 'f'));

        $this->putJson("/api/patients/{$patient->id}", ['allergies' => [['allergen' => 'Ibuprofen', 'severity' => 'mild']]])->assertOk();
        $this->assertSame(['Ibuprofen'], $patient->allergies()->pluck('allergen')->all());

        $this->putJson("/api/patients/{$patient->id}", ['allergies' => [['allergen' => 'X', 'severity' => 'catastrophic']]])->assertStatus(422);
        $this->assertSame(['Ibuprofen'], $patient->fresh()->allergies()->pluck('allergen')->all()); // unchanged on failure

        $this->putJson("/api/patients/{$patient->id}", ['allergies' => []])->assertOk();
        $this->assertSame(0, $patient->allergies()->count());
    }
}
