<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\SoapNote;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicalCoreApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Patient $patient;
    protected Appointment $appointment;
    protected Encounter $encounter;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->seed(RolesAndPermissionsSeeder::class);

        // Create Doctor and Patient
        $this->doctorUser = User::create([
            'name' => 'Dr. John Watson',
            'email' => 'watson@medimind.test',
            'mobile' => '+919999999991',
            'password' => bcrypt('password123'),
            'role' => UserRole::Doctor->value,
            'status' => 'active',
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'registration_number' => 'DOC99999',
            'specialization' => 'Pulmonology',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'name' => 'Sherlock Holmes',
            'mobile' => '+919876543212',
        ]);

        $this->appointment = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => '11:00:00',
            'slot_token' => 1,
            'status' => 'in_consultation',
            'triage_level' => 'green',
            'chief_complaint' => 'Chronic cough',
            'booked_by' => $this->doctorUser->id,
        ]);

        $this->encounter = Encounter::create([
            'appointment_id' => $this->appointment->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'encounter_date' => date('Y-m-d'),
            'status' => 'in_progress',
        ]);
    }

    /**
     * Test active encounters list retrieval.
     */
    public function test_can_list_active_encounters(): void
    {
        Sanctum::actingAs($this->doctorUser);

        $response = $this->getJson('/api/encounters');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    /**
     * Test updating SOAP note draft.
     */
    public function test_can_update_soap_note_draft(): void
    {
        Sanctum::actingAs($this->doctorUser);

        $payload = [
            'subjective' => 'Dry cough for 2 weeks.',
            'objective' => 'Clear chest on auscultation.',
            'assessment' => 'Mild bronchitis.',
            'plan' => 'Hydration and rest.',
        ];

        $response = $this->putJson("/api/encounters/{$this->encounter->id}/soap", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.subjective', 'Dry cough for 2 weeks.')
            ->assertJsonPath('data.doctor_signed', false);

        $this->assertDatabaseHas('soap_notes', ['encounter_id' => $this->encounter->id, 'doctor_signed' => false]);
        $this->assertSame('Dry cough for 2 weeks.', \App\Models\SoapNote::where('encounter_id', $this->encounter->id)->first()->subjective);
    }

    /**
     * Test signed SOAP note immutability.
     */
    public function test_cannot_update_signed_soap_note(): void
    {
        Sanctum::actingAs($this->doctorUser);

        // Pre-create a signed SOAP note
        SoapNote::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'subjective' => 'Initial subjective',
            'doctor_signed' => true,
            'signed_at' => now(),
        ]);

        $payload = [
            'subjective' => 'Attempted update text',
        ];

        $response = $this->putJson("/api/encounters/{$this->encounter->id}/soap", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['soap_note']);
    }

    /**
     * Test signing SOAP Note.
     */
    public function test_can_sign_soap_note(): void
    {
        Sanctum::actingAs($this->doctorUser);

        // Pre-create unsigned SOAP Note
        SoapNote::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'subjective' => 'Dry cough',
            'doctor_signed' => false,
        ]);

        $response = $this->postJson("/api/encounters/{$this->encounter->id}/sign");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.doctor_signed', true);

        $this->assertDatabaseHas('soap_notes', [
            'encounter_id' => $this->encounter->id,
            'doctor_signed' => true,
        ]);
    }

    /**
     * Test saving draft prescription.
     */
    public function test_can_save_prescription_draft(): void
    {
        Sanctum::actingAs($this->doctorUser);

        $payload = [
            'encounter_id' => $this->encounter->id,
            'medicines' => [
                [
                    'name' => 'Paracetamol',
                    'dosage' => '500mg',
                    'frequency' => 'TDS',
                    'duration' => '3 days',
                ]
            ],
            'instructions' => 'Take after food.',
        ];

        $response = $this->postJson('/api/prescriptions', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('prescriptions', [
            'encounter_id' => $this->encounter->id,
            'doctor_approved' => false,
        ]);
    }

    /**
     * Test prescription duplicate therapy rejection.
     */
    public function test_rejects_prescription_with_duplicate_therapies(): void
    {
        Sanctum::actingAs($this->doctorUser);

        $payload = [
            'encounter_id' => $this->encounter->id,
            'medicines' => [
                [
                    'name' => 'Amoxicillin',
                    'dosage' => '500mg',
                    'frequency' => 'TDS',
                    'duration' => '7 days',
                ],
                [
                    'name' => 'amoxicillin', // duplicate case-insensitive
                    'dosage' => '250mg',
                    'frequency' => 'BD',
                    'duration' => '5 days',
                ]
            ],
        ];

        $response = $this->postJson('/api/prescriptions', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['medicines']);
    }

    /**
     * Test approved prescription immutability.
     */
    public function test_cannot_modify_approved_prescription(): void
    {
        Sanctum::actingAs($this->doctorUser);

        // Pre-create approved prescription
        Prescription::create([
            'prescription_no' => 'RX-2026-00001',
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'medicines' => [
                [
                    'name' => 'Paracetamol',
                    'dosage' => '500mg',
                    'frequency' => 'TDS',
                    'duration' => '3 days',
                ]
            ],
            'doctor_approved' => true,
            'approved_at' => now(),
        ]);

        $payload = [
            'encounter_id' => $this->encounter->id,
            'medicines' => [
                [
                    'name' => 'Ibuprofen',
                    'dosage' => '400mg',
                    'frequency' => 'BD',
                    'duration' => '3 days',
                ]
            ],
        ];

        $response = $this->postJson('/api/prescriptions', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['prescription']);
    }

    /**
     * Test encounter completion pre-requisites.
     */
    public function test_encounter_completion_requires_signed_soap_note(): void
    {
        Sanctum::actingAs($this->doctorUser);

        // Case 1: Attempt completion without SOAP Note
        $response = $this->postJson("/api/encounters/{$this->encounter->id}/complete");
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['encounter']);

        // Case 2: Attempt completion with unsigned SOAP Note
        SoapNote::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'doctor_signed' => false,
        ]);

        $response2 = $this->postJson("/api/encounters/{$this->encounter->id}/complete");
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['encounter']);

        // Case 3: Complete with signed SOAP Note
        SoapNote::where('encounter_id', $this->encounter->id)->update([
            'doctor_signed' => true,
            'signed_at' => now(),
        ]);

        $response3 = $this->postJson("/api/encounters/{$this->encounter->id}/complete");
        $response3->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('encounters', [
            'id' => $this->encounter->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $this->appointment->id,
            'status' => 'completed',
        ]);
    }
}
