<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientAndAppointmentApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->seed(RolesAndPermissionsSeeder::class);

        // Create an authorized user (Clinic Admin / Front Desk) for API calls
        $this->adminUser = User::create([
            'name' => 'Clinic Admin User',
            'email' => 'admin@medimind.test',
            'mobile' => '+919999999999',
            'password' => bcrypt('password123'),
            'role' => UserRole::ClinicAdmin->value,
            'status' => 'active',
        ]);
        $this->adminUser->assignRole('clinic_admin');
    }

    /**
     * Test onboarding a new patient.
     */
    public function test_can_onboard_new_patient(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'name' => 'John Doe',
            'date_of_birth' => '1990-05-15',
            'age' => 36,
            'gender' => 'Male',
            'mobile' => '+919876543210',
            'email' => 'johndoe@example.com',
            'address' => '123 EMR St, Medical City',
            'blood_group' => 'O+',
            'abha_id' => '12-3456-7890-1234',
        ];

        $response = $this->postJson('/api/patients', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Patient registered successfully.')
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'patient_code',
                    'name',
                    'mobile',
                    'user_id'
                ]
            ]);

        $this->assertDatabaseHas('patients', [
            'mobile' => '+919876543210',
            'name' => 'John Doe',
        ]);

        $this->assertDatabaseHas('users', [
            'mobile' => '+919876543210',
            'role' => UserRole::Patient->value,
        ]);
    }

    /**
     * Test patient onboarding duplicate check.
     */
    public function test_cannot_onboard_duplicate_patient_mobile(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Onboard first patient
        Patient::create([
            'name' => 'First Patient',
            'mobile' => '+919876543210',
            'is_active' => true,
        ]);

        $payload = [
            'name' => 'Second Patient',
            'mobile' => '+919876543210', // duplicate
            'gender' => 'Female',
        ];

        $response = $this->postJson('/api/patients', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile']);
    }

    /**
     * Test booking an appointment.
     */
    public function test_can_book_appointment_successfully(): void
    {
        Sanctum::actingAs($this->adminUser);

        $patient = Patient::create([
            'name' => 'Patient A',
            'mobile' => '+919876543210',
        ]);

        $doctorUser = User::create([
            'name' => 'Dr. Smith',
            'email' => 'smith@medimind.test',
            'mobile' => '+919999888877',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'registration_number' => 'DOC12345',
            'specialization' => 'ENT',
            'available_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            'slot_duration_mins' => 15,
            'is_active' => true,
        ]);

        $payload = [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => date('Y-m-d', strtotime('+1 day')),
            'appointment_time' => '10:00',
            'type' => 'regular',
            'triage_level' => 'green',
            'chief_complaint' => 'Throat pain',
        ];

        $response = $this->postJson('/api/appointments', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Appointment booked successfully.');

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_time' => '10:00:00',
            'triage_level' => 'green',
        ]);
    }

    /**
     * Test double booking prevention.
     */
    public function test_prevents_double_booking_same_slot(): void
    {
        Sanctum::actingAs($this->adminUser);

        $patientA = Patient::create([
            'name' => 'Patient A',
            'mobile' => '+919876543210',
        ]);

        $patientB = Patient::create([
            'name' => 'Patient B',
            'mobile' => '+919876543211',
        ]);

        $doctorUser = User::create([
            'name' => 'Dr. Smith',
            'email' => 'smith@medimind.test',
            'mobile' => '+919999888877',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'registration_number' => 'DOC12345',
            'specialization' => 'ENT',
            'is_active' => true,
        ]);

        $appointmentDate = date('Y-m-d', strtotime('+1 day'));

        // Book first appointment
        Appointment::create([
            'patient_id' => $patientA->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $appointmentDate,
            'appointment_time' => '10:00:00',
            'slot_token' => 1,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'green',
            'chief_complaint' => 'Throat pain',
            'booked_by' => $this->adminUser->id,
        ]);

        // Attempt duplicate booking for Patient B at the same time
        $payload = [
            'patient_id' => $patientB->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $appointmentDate,
            'appointment_time' => '10:00',
            'type' => 'regular',
            'triage_level' => 'green',
            'chief_complaint' => 'Ear pain',
        ];

        $response = $this->postJson('/api/appointments', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['appointment_time']);
    }

    /**
     * Test daily queue prioritized sorting logic (red > amber > green, then time).
     */
    public function test_queue_sorting_by_triage_priority(): void
    {
        Sanctum::actingAs($this->adminUser);

        $doctorUser = User::create([
            'name' => 'Dr. Smith',
            'email' => 'smith@medimind.test',
            'mobile' => '+919999888877',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'registration_number' => 'DOC12345',
            'specialization' => 'ENT',
            'is_active' => true,
        ]);

        $patientGreen = Patient::create(['name' => 'Green Patient', 'mobile' => '+919876543201']);
        $patientAmber = Patient::create(['name' => 'Amber Patient', 'mobile' => '+919876543202']);
        $patientRed = Patient::create(['name' => 'Red Patient', 'mobile' => '+919876543203']);

        $today = date('Y-m-d');

        // Create appointments with different times and triage levels
        // Green is early morning, Amber is noon, Red is afternoon
        // Expected sort: Red Patient, Amber Patient, Green Patient (regardless of time)
        Appointment::create([
            'patient_id' => $patientGreen->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $today,
            'appointment_time' => '09:00:00',
            'slot_token' => 1,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'green',
            'chief_complaint' => 'Complaint Green',
            'booked_by' => $this->adminUser->id,
        ]);

        Appointment::create([
            'patient_id' => $patientAmber->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $today,
            'appointment_time' => '12:00:00',
            'slot_token' => 2,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'amber',
            'chief_complaint' => 'Complaint Amber',
            'booked_by' => $this->adminUser->id,
        ]);

        Appointment::create([
            'patient_id' => $patientRed->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $today,
            'appointment_time' => '15:00:00',
            'slot_token' => 3,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'red',
            'chief_complaint' => 'Complaint Red',
            'booked_by' => $this->adminUser->id,
        ]);

        $response = $this->getJson("/api/appointments/queue?doctor_id={$doctor->id}&date={$today}");

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $this->assertCount(3, $data);

        // Sorting check: RED > AMBER > GREEN
        $this->assertEquals('red', $data[0]['triage_level']);
        $this->assertEquals($patientRed->id, $data[0]['patient_id']);

        $this->assertEquals('amber', $data[1]['triage_level']);
        $this->assertEquals($patientAmber->id, $data[1]['patient_id']);

        $this->assertEquals('green', $data[2]['triage_level']);
        $this->assertEquals($patientGreen->id, $data[2]['patient_id']);
    }

    /**
     * Test Encounter auto creation on consultation start.
     */
    public function test_encounter_auto_created_on_in_consultation_status(): void
    {
        Sanctum::actingAs($this->adminUser);

        $patient = Patient::create([
            'name' => 'Patient Test',
            'mobile' => '+919876543210',
        ]);

        $doctorUser = User::create([
            'name' => 'Dr. Smith',
            'email' => 'smith@medimind.test',
            'mobile' => '+919999888877',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'registration_number' => 'DOC12345',
            'specialization' => 'ENT',
            'is_active' => true,
        ]);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => '10:00:00',
            'slot_token' => 1,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'green',
            'chief_complaint' => 'Complaint',
            'booked_by' => $this->adminUser->id,
        ]);

        $this->assertDatabaseMissing('encounters', [
            'appointment_id' => $appointment->id,
        ]);

        // Transition to in_consultation
        $response = $this->patchJson("/api/appointments/{$appointment->id}/status", [
            'status' => 'in_consultation',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('encounters', [
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'in_progress',
        ]);
    }

    /**
     * Test saving clinical assessment and dispatching.
     */
    public function test_can_save_clinical_assessment_and_dispatch(): void
    {
        Sanctum::actingAs($this->adminUser);

        $patient = Patient::create([
            'name' => 'John Watson',
            'mobile' => '+919876543212',
        ]);

        $doctorUser = User::create([
            'name' => 'Dr. Sherlock',
            'email' => 'sherlock@medimind.test',
            'mobile' => '+919999888899',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'registration_number' => 'DOC99881',
            'specialization' => 'Pulmonology',
            'is_active' => true,
        ]);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => '11:00:00',
            'slot_token' => 5,
            'type' => 'regular',
            'status' => 'booked',
            'triage_level' => 'green',
            'chief_complaint' => 'Coughing',
            'booked_by' => $this->adminUser->id,
        ]);

        $payload = [
            'triage_level' => 'amber',
            'chief_complaint' => 'Severe coughing with blood',
            'vitals' => [
                'bp' => '130/85',
                'hr' => 88,
                'temp' => '99.5 °F',
                'spo2' => 97,
            ],
            'symptoms' => [
                [
                    'id' => 'q-1',
                    'text' => 'Any chest pain?',
                    'answer' => 'Yes, mild chest soreness.',
                ],
            ],
            'soap_note' => [
                'subjective' => 'Patient has hemoptysis for 2 days.',
                'objective' => 'Lungs clear on auscultation.',
                'assessment' => 'Possible bronchitis or TB.',
                'plan' => 'Chest X-ray and sputum culture.',
            ],
        ];

        $response = $this->postJson("/api/appointments/{$appointment->id}/assessment", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Clinical assessment saved and patient case dispatched successfully.');

        // Verify appointment was updated
        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 'in_queue',
            'triage_level' => 'amber',
            'chief_complaint' => 'Severe coughing with blood',
        ]);

        // Verify encounter was created
        $encounter = \App\Models\Encounter::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($encounter);

        // Verify symptom was saved
        $this->assertDatabaseHas('symptoms', [
            'encounter_id' => $encounter->id,
            'patient_id' => $patient->id,
            'collected_via' => 'form',
        ]);

        // Verify soap note was saved
        $this->assertDatabaseHas('soap_notes', [
            'encounter_id' => $encounter->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'subjective' => 'Patient has hemoptysis for 2 days.',
            'objective' => 'Lungs clear on auscultation.',
        ]);
    }
}
