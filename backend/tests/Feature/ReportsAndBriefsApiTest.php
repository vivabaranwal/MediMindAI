<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AiBrief;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportsAndBriefsApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Patient $patient;
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

        $this->patient = Patient::create([
            'name' => 'Sherlock Holmes',
            'mobile' => '+919876543212',
        ]);

        $this->encounter = Encounter::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'encounter_date' => date('Y-m-d'),
            'status' => 'in_progress',
        ]);
    }

    /**
     * Test uploading a valid medical report.
     */
    public function test_can_upload_valid_report(): void
    {
        Storage::fake();
        Sanctum::actingAs($this->doctorUser);

        $file = UploadedFile::fake()->create('blood_test.pdf', 1000, 'application/pdf');

        $payload = [
            'file' => $file,
            'patient_id' => $this->patient->id,
            'encounter_id' => $this->encounter->id,
            'report_type' => 'blood_test',
        ];

        Queue::fake();

        $response = $this->postJson('/api/reports/upload', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'pending_analysis');

        Queue::assertPushed(\App\Jobs\AnalyzeReportJob::class);

        $report = Report::first();
        $this->assertNotNull($report);
        $this->assertEquals('blood_test.pdf', $report->file_name);
        $this->assertEquals('pending_analysis', $report->status);
        $this->assertFalse($report->ai_processed);

        Storage::assertExists($report->file_path);
    }

    /**
     * Test uploading report with invalid extension.
     */
    public function test_cannot_upload_invalid_file_extension(): void
    {
        Storage::fake();
        Sanctum::actingAs($this->doctorUser);

        // Uploading txt file (invalid mime)
        $file = UploadedFile::fake()->create('malicious.txt', 10, 'text/plain');

        $payload = [
            'file' => $file,
            'patient_id' => $this->patient->id,
            'report_type' => 'blood_test',
        ];

        $response = $this->postJson('/api/reports/upload', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test uploading report exceeding 20MB.
     */
    public function test_cannot_upload_file_exceeding_size_limit(): void
    {
        Storage::fake();
        Sanctum::actingAs($this->doctorUser);

        // 21MB file (21504 KB)
        $file = UploadedFile::fake()->create('giant_scan.png', 21500, 'image/png');

        $payload = [
            'file' => $file,
            'patient_id' => $this->patient->id,
            'report_type' => 'xray',
        ];

        $response = $this->postJson('/api/reports/upload', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test retrieving reports list for a patient.
     */
    public function test_can_retrieve_patient_reports(): void
    {
        Sanctum::actingAs($this->doctorUser);

        Report::create([
            'patient_id' => $this->patient->id,
            'report_type' => 'blood_test',
            'file_name' => 'test1.pdf',
            'file_path' => 'reports/test1.pdf',
            'status' => 'pending_analysis',
        ]);

        $response = $this->getJson("/api/reports?patient_id={$this->patient->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    /**
     * Brief generation against the engine contract (consent granted).
     */
    public function test_can_regenerate_ai_brief_successfully(): void
    {
        Sanctum::actingAs($this->doctorUser);
        config(['services.fastapi.secret' => 'unit-test-secret-0123456789', 'services.fastapi.url' => 'http://engine.test']);
        app(\App\Services\Ai\ConsentService::class)->record($this->patient, 'ai_assistance', true);

        Http::fake([
            'engine.test/internal/v1/briefs' => Http::response([
                'brief' => 'The patient Holmes presents with chronic cough...',
                'risk_level' => 'medium',
                'risk_rationale' => 'Persistent cough.',
                'risk_floor_applied' => false,
                'red_flags' => [],
                'suggested_questions' => ['How long has the cough persisted?'],
                'disclaimer' => 'AI-generated',
                'meta' => ['model' => 'gpt-4o-mini', 'input_tokens' => 800, 'output_tokens' => 400, 'latency_ms' => 450, 'prompt_version' => 'v1'],
            ], 200),
        ]);

        $response = $this->postJson("/api/ai/briefs/{$this->encounter->id}/regenerate");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.brief_text', 'The patient Holmes presents with chronic cough...')
            ->assertJsonPath('data.risk_level', 'medium');

        $this->assertDatabaseHas('ai_briefs', [
            'encounter_id' => $this->encounter->id,
            'risk_level' => 'medium',
            'llm_model_used' => 'gpt-4o-mini',
            'token_count' => 1200,
            'generation_time_ms' => 450,
        ]);
    }
}
