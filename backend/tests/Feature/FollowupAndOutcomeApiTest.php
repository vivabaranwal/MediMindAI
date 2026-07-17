<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Followup;
use App\Models\Outcome;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FollowupAndOutcomeApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected User $patientUser;
    protected Doctor $doctor;
    protected Patient $patient;
    protected Appointment $appointment;
    protected Encounter $encounter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->doctorUser = User::create([
            'name' => 'Dr. Watson',
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

        $this->patientUser = User::create([
            'name' => 'Sherlock Holmes',
            'email' => 'sherlock@medimind.test',
            'mobile' => '+919876543212',
            'password' => bcrypt('password123'),
            'role' => UserRole::Patient->value,
            'status' => 'active',
        ]);
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
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
     * Test scheduling a patient follow-up.
     */
    public function test_can_schedule_followup_successfully(): void
    {
        Sanctum::actingAs($this->doctorUser);

        $payload = [
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'scheduled_date' => date('Y-m-d', strtotime('+3 days')),
            'medium' => 'whatsapp',
            'questions' => ['Are you feeling better?', 'Any side effects?'],
        ];

        $response = $this->postJson('/api/followups', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('followups', [
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Test patient submitting a normal improved outcome.
     */
    public function test_can_submit_normal_outcome_successfully(): void
    {
        Sanctum::actingAs($this->patientUser);

        $followup = Followup::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'scheduled_date' => date('Y-m-d'),
            'status' => 'pending',
            'medium' => 'whatsapp',
        ]);

        $payload = [
            'followup_id' => $followup->id,
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'improved',
            'symptom_scores' => ['pain' => 1],
            'side_effects' => ['none'],
            'patient_notes' => 'Feeling much better now.',
        ];

        $response = $this->postJson('/api/outcomes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.ai_outcome_label', 'normal');

        $this->assertDatabaseHas('followups', [
            'id' => $followup->id,
            'status' => 'responded',
        ]);

        $this->assertDatabaseHas('outcomes', [
            'followup_id' => $followup->id,
            'treatment_worked' => 'improved',
            'ai_outcome_label' => 'normal',
        ]);

        // Appointment triage should remain green
        $appointment = $this->appointment->fresh();
        $this->assertEquals('green', $appointment->triage_level);
    }

    /**
     * Test escalation detection for worsened outcome.
     */
    public function test_escalation_detection_triggers_on_worsened_treatment(): void
    {
        Sanctum::actingAs($this->patientUser);

        $followup = Followup::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'scheduled_date' => date('Y-m-d'),
            'status' => 'pending',
            'medium' => 'whatsapp',
        ]);

        $payload = [
            'followup_id' => $followup->id,
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'worsened', // triggers escalation
            'symptom_scores' => ['pain' => 8],
            'side_effects' => ['fever'],
            'patient_notes' => 'My symptoms have worsened and I have a high fever.',
        ];

        $response = $this->postJson('/api/outcomes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.ai_outcome_label', 'escalated');

        // Verify appointment triage level escalated to red
        $appointment = $this->appointment->fresh();
        $this->assertEquals('red', $appointment->triage_level);
    }

    /**
     * Test escalation detection for severe side effects.
     */
    public function test_escalation_detection_triggers_on_severe_side_effects(): void
    {
        Sanctum::actingAs($this->patientUser);

        $followup = Followup::create([
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'scheduled_date' => date('Y-m-d'),
            'status' => 'pending',
            'medium' => 'whatsapp',
        ]);

        $payload = [
            'followup_id' => $followup->id,
            'encounter_id' => $this->encounter->id,
            'patient_id' => $this->patient->id,
            'treatment_worked' => 'no_change',
            'side_effects' => ['severe nausea and rash'], // triggers escalation (contains "severe")
            'patient_notes' => 'I cannot tolerate the medicine.',
        ];

        $response = $this->postJson('/api/outcomes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.ai_outcome_label', 'escalated');

        // Verify appointment triage level escalated to red
        $appointment = $this->appointment->fresh();
        $this->assertEquals('red', $appointment->triage_level);
    }
}
