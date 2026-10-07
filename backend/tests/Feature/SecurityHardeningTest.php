<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
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
            'name' => ucfirst($role->value) . $tag, 'email' => "{$role->value}{$tag}@medimind.test", 'mobile' => '+9110000' . random_int(10000, 99999),
            'password' => bcrypt('a-strong-password'), 'role' => $role->value, 'status' => 'active',
        ]);
        $u->assignRole($role->value);
        return $u;
    }

    private function newStaff(string $role, string $tag = 'x'): array
    {
        return [
            'name' => 'New Staff ' . $tag, 'email' => "new{$tag}@medimind.test", 'mobile' => '+9199000' . random_int(10000, 99999),
            'password' => 'a-strong-password', 'role' => $role,
        ];
    }

    // ------------------------------------------------------ admin escalation

    public function test_clinic_admin_cannot_create_a_super_admin(): void
    {
        Sanctum::actingAs($this->user(UserRole::ClinicAdmin, 'a'));

        $this->postJson('/api/admin/users', $this->newStaff('super_admin'))->assertStatus(403);
        $this->assertSame(0, User::where('role', 'super_admin')->count());

        $this->postJson('/api/admin/users', $this->newStaff('doctor', 'd'))->assertStatus(201);
    }

    public function test_clinic_admin_cannot_promote_or_touch_an_existing_super_admin(): void
    {
        $super = $this->user(UserRole::SuperAdmin, 's');
        $clinic = $this->user(UserRole::ClinicAdmin, 'c');
        $victim = $this->user(UserRole::Doctor, 'v');
        Sanctum::actingAs($clinic);

        $this->putJson("/api/admin/users/{$victim->id}", ['role' => 'super_admin'])->assertStatus(403);
        $this->getJson("/api/admin/users/{$super->id}")->assertStatus(403);
        $this->putJson("/api/admin/users/{$super->id}", ['status' => 'inactive'])->assertStatus(403);
        $this->deleteJson("/api/admin/users/{$super->id}")->assertStatus(403);

        $this->assertSame('doctor', $victim->fresh()->role);
        $this->assertSame('active', $super->fresh()->status);
    }

    public function test_super_admin_can_manage_admins_but_not_delete_themselves(): void
    {
        $super = $this->user(UserRole::SuperAdmin, 's');
        Sanctum::actingAs($super);

        $this->postJson('/api/admin/users', $this->newStaff('super_admin', 'z'))->assertStatus(201);
        $this->deleteJson("/api/admin/users/{$super->id}")->assertStatus(422);
        $this->assertNotNull($super->fresh());
    }

    // --------------------------------------------------------------- outcomes

    private function encounterFor(Patient $patient): Encounter
    {
        $doctor = Doctor::first() ?? Doctor::create([
            'user_id' => $this->user(UserRole::Doctor, 'dx')->id, 'registration_number' => 'DOCX', 'specialization' => 'ENT', 'is_active' => true,
        ]);
        return Encounter::create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'encounter_date' => date('Y-m-d'), 'status' => 'completed']);
    }

    public function test_patient_can_only_submit_and_read_their_own_outcomes(): void
    {
        $mine = $this->user(UserRole::Patient, 'p1');
        $myRecord = Patient::create(['name' => 'Mine', 'mobile' => '+919800000001', 'user_id' => $mine->id]);
        $other = Patient::create(['name' => 'Other', 'mobile' => '+919800000002']);
        $myEnc = $this->encounterFor($myRecord);
        $otherEnc = $this->encounterFor($other);
        Sanctum::actingAs($mine);

        $body = fn (Patient $p, Encounter $e) => ['patient_id' => $p->id, 'encounter_id' => $e->id, 'treatment_worked' => 'improved'];

        $this->postJson('/api/outcomes', $body($myRecord, $myEnc))->assertStatus(201);
        $this->postJson('/api/outcomes', $body($other, $otherEnc))->assertStatus(403);
        $this->getJson("/api/outcomes?patient_id={$myRecord->id}")->assertOk();
        $this->getJson("/api/outcomes?patient_id={$other->id}")->assertStatus(403);
    }

    public function test_outcome_cannot_reference_another_patients_encounter(): void
    {
        $mine = $this->user(UserRole::Patient, 'p1');
        $myRecord = Patient::create(['name' => 'Mine', 'mobile' => '+919800000001', 'user_id' => $mine->id]);
        $other = Patient::create(['name' => 'Other', 'mobile' => '+919800000002']);
        $otherEnc = $this->encounterFor($other);
        Sanctum::actingAs($mine);

        $this->postJson('/api/outcomes', ['patient_id' => $myRecord->id, 'encounter_id' => $otherEnc->id, 'treatment_worked' => 'improved'])
            ->assertStatus(422);
    }

    // ------------------------------------------------------------------ seeders

    public function test_seeder_refuses_default_password_outside_local_and_testing(): void
    {
        $this->app['env'] = 'production';
        putenv('SEED_ADMIN_PASSWORD');
        unset($_ENV['SEED_ADMIN_PASSWORD'], $_SERVER['SEED_ADMIN_PASSWORD']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('SEED_ADMIN_PASSWORD');
        (new AdminUserSeeder())->run();
    }

    // -------------------------------------------------------------------- audit

    public function test_token_authenticated_writes_are_audited_with_field_names_only(): void
    {
        $desk = $this->user(UserRole::FrontDesk, 'f');
        Sanctum::actingAs($desk);

        $this->postJson('/api/patients', ['name' => 'Highly Sensitive Name', 'mobile' => '+919800000077'])->assertStatus(201);

        $log = AuditLog::where('user_id', $desk->id)->latest('id')->first();
        $this->assertNotNull($log, 'audit row should exist for a Sanctum-authenticated write');
        $this->assertSame('Patient', $log->resource_type);
        $this->assertEqualsCanonicalizing(['name', 'mobile'], $log->new_values);
        $this->assertStringNotContainsString('Highly Sensitive Name', json_encode($log->toArray()));
        $this->assertStringNotContainsString('+919800000077', json_encode($log->toArray()));
    }

    public function test_reads_are_not_audited_and_passwords_never_appear(): void
    {
        $admin = $this->user(UserRole::SuperAdmin, 's');
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')->assertOk();
        $this->assertSame(0, AuditLog::count());

        $this->postJson('/api/admin/users', $this->newStaff('doctor', 'q'))->assertStatus(201);
        $log = AuditLog::first();
        $this->assertNotContains('password', $log->new_values);
    }
}
