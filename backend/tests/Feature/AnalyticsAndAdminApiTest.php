<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Outcome;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsAndAdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdminUser;
    protected User $clinicAdminUser;
    protected User $doctorUser1;
    protected User $doctorUser2;
    protected User $frontDeskUser;
    protected User $patientUser;

    protected Doctor $doctor1;
    protected Doctor $doctor2;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        // 1. Create Roles & Users
        $this->superAdminUser = User::create([
            'name' => 'Super Admin',
            'email' => 'super@medimind.test',
            'mobile' => '+919999999901',
            'password' => bcrypt('password123'),
            'role' => UserRole::SuperAdmin->value,
            'status' => 'active',
        ]);
        $this->superAdminUser->assignRole('super_admin');

        $this->clinicAdminUser = User::create([
            'name' => 'Clinic Admin',
            'email' => 'clinic@medimind.test',
            'mobile' => '+919999999902',
            'password' => bcrypt('password123'),
            'role' => UserRole::ClinicAdmin->value,
            'status' => 'active',
        ]);
        $this->clinicAdminUser->assignRole('clinic_admin');

        $this->doctorUser1 = User::create([
            'name' => 'Dr. House',
            'email' => 'house@medimind.test',
            'mobile' => '+919999999903',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);
        $this->doctorUser1->assignRole('doctor');

        $this->doctor1 = Doctor::create([
            'user_id' => $this->doctorUser1->id,
            'registration_number' => 'DOC10001',
            'specialization' => 'Diagnostics',
            'is_active' => true,
        ]);

        $this->doctorUser2 = User::create([
            'name' => 'Dr. Wilson',
            'email' => 'wilson@medimind.test',
            'mobile' => '+919999999904',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);
        $this->doctorUser2->assignRole('doctor');

        $this->doctor2 = Doctor::create([
            'user_id' => $this->doctorUser2->id,
            'registration_number' => 'DOC10002',
            'specialization' => 'Oncology',
            'is_active' => true,
        ]);

        $this->frontDeskUser = User::create([
            'name' => 'John Front Desk',
            'email' => 'front@medimind.test',
            'mobile' => '+919999999905',
            'password' => bcrypt('password123'),
            'role' => UserRole::FrontDesk->value,
            'status' => 'active',
        ]);
        $this->frontDeskUser->assignRole('front_desk');

        $this->patientUser = User::create([
            'name' => 'John Doe',
            'email' => 'patient@medimind.test',
            'mobile' => '+919999999906',
            'password' => bcrypt('password123'),
            'role' => UserRole::Patient->value,
            'status' => 'active',
        ]);
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'name' => 'John Doe',
            'mobile' => '+919999999906',
        ]);
    }

    /**
     * Test Doctor performance metrics calculations.
     */
    public function test_doctor_metrics_calculation(): void
    {
        // Setup 2 encounters for doctor1: 1 completed (15 mins duration), 1 in_progress
        $apt1 = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => '10:00:00',
            'slot_token' => 1,
            'status' => 'completed',
        ]);

        Encounter::create([
            'appointment_id' => $apt1->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'encounter_date' => date('Y-m-d'),
            'status' => 'completed',
            'started_at' => now()->subMinutes(15),
            'completed_at' => now(),
        ]);

        $apt2 = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => '11:30:00',
            'slot_token' => 2,
            'status' => 'in_consultation',
        ]);

        Encounter::create([
            'appointment_id' => $apt2->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'encounter_date' => date('Y-m-d'),
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        // Access as Doctor1 themselves
        Sanctum::actingAs($this->doctorUser1);
        $response = $this->getJson('/api/analytics/doctor');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.completed_encounters_count', 1)
            ->assertJsonPath('data.average_consultation_duration_minutes', 15);

        // Access as Super Admin querying Doctor1
        Sanctum::actingAs($this->superAdminUser);
        $responseAdmin = $this->getJson('/api/analytics/doctor?doctor_id=' . $this->doctor1->id);

        $responseAdmin->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.completed_encounters_count', 1);
    }

    /**
     * Test Clinic analytics metrics calculations.
     */
    public function test_clinic_metrics_calculation(): void
    {
        // 3 appointments today: 1 completed, 1 no_show, 1 booked
        $today = date('Y-m-d');

        // Completed apt scheduled at 10:00:00, started encounter at 10:10:00 (10 mins wait)
        $apt1 = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'appointment_date' => $today,
            'appointment_time' => '10:00:00',
            'slot_token' => 1,
            'status' => 'completed',
        ]);

        Encounter::create([
            'appointment_id' => $apt1->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'encounter_date' => $today,
            'status' => 'completed',
            'started_at' => \Carbon\Carbon::parse($today . ' 10:10:00'),
            'completed_at' => \Carbon\Carbon::parse($today . ' 10:25:00'),
        ]);

        // No-show appointment
        Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'appointment_date' => $today,
            'appointment_time' => '11:00:00',
            'slot_token' => 2,
            'status' => 'no_show',
        ]);

        // Normal booked appointment
        Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'appointment_date' => $today,
            'appointment_time' => '12:00:00',
            'slot_token' => 3,
            'status' => 'booked',
        ]);

        Sanctum::actingAs($this->clinicAdminUser);
        $response = $this->getJson('/api/analytics/clinic');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_appointments_today', 3)
            ->assertJsonPath('data.average_waiting_time_minutes', 10)
            ->assertJsonPath('data.no_show_rate_percentage', 33.33);
    }

    /**
     * Test outcomes aggregate calculations.
     */
    public function test_outcome_trends_calculation(): void
    {
        $encounter = Encounter::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor1->id,
            'encounter_date' => date('Y-m-d'),
            'status' => 'completed',
        ]);

        // Create 4 outcomes: 2 improved, 1 no_change, 1 escalated
        Outcome::create([
            'encounter_id' => $encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'improved',
            'ai_outcome_label' => 'normal',
        ]);

        Outcome::create([
            'encounter_id' => $encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'improved',
            'ai_outcome_label' => 'normal',
        ]);

        Outcome::create([
            'encounter_id' => $encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'no_change',
            'ai_outcome_label' => 'normal',
        ]);

        Outcome::create([
            'encounter_id' => $encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'worsened',
            'ai_outcome_label' => 'escalated',
        ]);

        Sanctum::actingAs($this->superAdminUser);
        $response = $this->getJson('/api/analytics/outcomes');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_outcomes', 4)
            ->assertJsonPath('data.recovery_rate_percentage', 50)
            ->assertJsonPath('data.escalation_rate_percentage', 25);
    }

    /**
     * Test Spatie RBAC enforcement on Analytics routes.
     */
    public function test_analytics_rbac_enforcement(): void
    {
        // 1. Patient should be forbidden from doctor analytics
        Sanctum::actingAs($this->patientUser);
        $response = $this->getJson('/api/analytics/doctor');
        $response->assertStatus(403);

        // 2. Doctor should be forbidden from querying another doctor
        Sanctum::actingAs($this->doctorUser1);
        $responseDoctorQueryOther = $this->getJson('/api/analytics/doctor?doctor_id=' . $this->doctor2->id);
        $responseDoctorQueryOther->assertStatus(403);

        // 3. Patient/Doctor forbidden from clinic metrics
        Sanctum::actingAs($this->patientUser);
        $this->getJson('/api/analytics/clinic')->assertStatus(403);

        Sanctum::actingAs($this->doctorUser1);
        $this->getJson('/api/analytics/clinic')->assertStatus(403);

        // 4. Patient/Doctor forbidden from outcomes analytics
        Sanctum::actingAs($this->patientUser);
        $this->getJson('/api/analytics/outcomes')->assertStatus(403);

        Sanctum::actingAs($this->doctorUser1);
        $this->getJson('/api/analytics/outcomes')->assertStatus(403);
    }

    /**
     * Test Admin User CRUD and roles Spatie assignment.
     */
    public function test_admin_user_crud_and_role_management(): void
    {
        Sanctum::actingAs($this->clinicAdminUser);

        // 1. Create a junior doctor user
        $payload = [
            'name' => 'Dr. Watson Junior',
            'email' => 'watson.jr@medimind.test',
            'mobile' => '+918888888881',
            'password' => 'password123',
            'role' => 'doctor',
            'status' => 'active',
        ];

        $response = $this->postJson('/api/admin/users', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Dr. Watson Junior');

        $this->assertDatabaseHas('users', [
            'email' => 'watson.jr@medimind.test',
            'role' => 'doctor',
        ]);

        $createdUser = User::where('email', 'watson.jr@medimind.test')->first();
        $this->assertTrue($createdUser->hasRole('doctor'));
        $this->assertDatabaseHas('doctors', [
            'user_id' => $createdUser->id,
        ]);

        // 2. Index staff list
        $indexResponse = $this->getJson('/api/admin/users');
        $indexResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        // 3. Show staff details
        $showResponse = $this->getJson('/api/admin/users/' . $createdUser->id);
        $showResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'watson.jr@medimind.test');

        // 4. Update staff user
        $updatePayload = [
            'name' => 'Dr. Watson Junior Revised',
            'role' => 'front_desk',
        ];

        $updateResponse = $this->putJson('/api/admin/users/' . $createdUser->id, $updatePayload);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Dr. Watson Junior Revised');

        $createdUser = $createdUser->fresh();
        $this->assertTrue($createdUser->hasRole('front_desk'));
        $this->assertFalse($createdUser->hasRole('doctor'));

        // 5. Delete staff user
        $deleteResponse = $this->deleteJson('/api/admin/users/' . $createdUser->id);
        $deleteResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('users', [
            'id' => $createdUser->id,
        ]);
    }

    /**
     * Verify that unauthorized roles receive 403 on User CRUD endpoints.
     */
    public function test_admin_user_crud_rbac_enforcement(): void
    {
        // 1. Doctor should be forbidden from admin users list
        Sanctum::actingAs($this->doctorUser1);
        $this->getJson('/api/admin/users')->assertStatus(403);
        $this->postJson('/api/admin/users', [])->assertStatus(403);

        // 2. Patient should be forbidden
        Sanctum::actingAs($this->patientUser);
        $this->getJson('/api/admin/users')->assertStatus(403);
    }
}
