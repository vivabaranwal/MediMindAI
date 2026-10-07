<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Allergy;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Clinical\DrugAllergyChecker;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrescriptionSafetyTest extends TestCase
{
    use RefreshDatabase;

    private User $authorUser;
    private Doctor $author;
    private Patient $patient;
    private Encounter $encounter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        [$this->authorUser, $this->author] = $this->doctor('a');
        $this->patient = Patient::create(['name' => 'Asha Verma', 'mobile' => '+919800000020']);
        Allergy::create(['patient_id' => $this->patient->id, 'allergen' => 'Penicillin']);
        $this->encounter = Encounter::create([
            'patient_id' => $this->patient->id, 'doctor_id' => $this->author->id, 'encounter_date' => date('Y-m-d'), 'status' => 'in_progress',
        ]);
    }

    private function doctor(string $tag): array
    {
        $u = User::create([
            'name' => "Dr {$tag}", 'email' => "dr{$tag}@medimind.test", 'mobile' => '+9130' . random_int(100000, 999999),
            'password' => bcrypt('a-strong-password'), 'role' => 'doctor', 'status' => 'active',
        ]);
        $u->assignRole('doctor');
        return [$u, Doctor::create(['user_id' => $u->id, 'registration_number' => "R{$tag}", 'specialization' => 'ENT', 'is_active' => true])];
    }

    private function draft(array $medicines): Prescription
    {
        return Prescription::create([
            'encounter_id' => $this->encounter->id, 'patient_id' => $this->patient->id, 'doctor_id' => $this->author->id,
            'medicines' => $medicines, 'doctor_approved' => false,
        ]);
    }

    // ------------------------------------------------------------ rule engine

    public function test_checker_rules(): void
    {
        $c = new DrugAllergyChecker();

        $this->assertSame('critical', $c->check('Amoxicillin-Clavulanate 1000mg', ['Penicillin'])[0]['severity']);
        $this->assertSame('warning', $c->check('Cefuroxime Axetil 500mg', ['penicillin'])[0]['severity']);
        $this->assertSame('critical', $c->check('Ibuprofen 400mg', ['NSAIDs'])[0]['severity']);
        $this->assertSame('critical', $c->check('Bactrim DS', ['Sulfa drugs'])[0]['severity']);
        $this->assertSame('critical', $c->check('Azithromycin 500', ['Macrolide antibiotics'])[0]['severity']);
        $this->assertSame('critical', $c->check('Clindamycin 300mg', ['clindamycin'])[0]['severity']);
        $this->assertSame([], $c->check('Paracetamol 650mg', ['Penicillin', 'Sulfa']));
        $this->assertSame([], $c->check('Amoxicillin', ['', '  ']));
        $this->assertSame([], $c->checkAll([], ['Penicillin']));
        $this->assertCount(2, $c->checkAll(['Amoxicillin', 'Ampicillin'], ['Penicillin']));
    }

    public function test_custom_medicines_are_checked_exactly_like_catalogue_ones(): void
    {
        // Regression: "Add New Medicine" used to bypass the allergy check entirely.
        Sanctum::actingAs($this->authorUser);
        $this->postJson('/api/prescriptions/check', [
            'patient_id' => $this->patient->id, 'medications' => [['name' => 'Some Custom Brand Amoxicillin 250']],
        ])->assertOk()->assertJsonPath('data.alerts.0.severity', 'critical');
    }

    // ------------------------------------------------------------ approval gate

    public function test_approval_is_blocked_by_a_critical_allergy_alert(): void
    {
        $rx = $this->draft([['name' => 'Amoxicillin', 'dosage' => '500mg', 'frequency' => 'BD', 'duration' => '5d']]);
        Sanctum::actingAs($this->authorUser);

        $this->postJson("/api/prescriptions/{$rx->id}/approve")
            ->assertStatus(422)->assertJsonPath('code', 'critical_allergy_alert')->assertJsonPath('alerts.0.severity', 'critical');

        $this->assertFalse((bool) $rx->fresh()->doctor_approved);
    }

    public function test_doctor_can_override_after_acknowledging(): void
    {
        $rx = $this->draft([['name' => 'Amoxicillin', 'dosage' => '500mg', 'frequency' => 'BD', 'duration' => '5d']]);
        Sanctum::actingAs($this->authorUser);

        $this->postJson("/api/prescriptions/{$rx->id}/approve", ['acknowledge_critical' => true])->assertOk();
        $this->assertTrue((bool) $rx->fresh()->doctor_approved);
    }

    public function test_safe_prescription_and_warnings_do_not_block(): void
    {
        $safe = $this->draft([['name' => 'Paracetamol', 'dosage' => '650mg', 'frequency' => 'QDS', 'duration' => '3d']]);
        $cross = $this->draft([['name' => 'Cefuroxime', 'dosage' => '500mg', 'frequency' => 'BD', 'duration' => '5d']]); // warning only
        Sanctum::actingAs($this->authorUser);

        $this->postJson("/api/prescriptions/{$safe->id}/approve")->assertOk();
        $this->postJson("/api/prescriptions/{$cross->id}/approve")->assertOk();
    }

    public function test_only_the_prescribing_doctor_can_approve(): void
    {
        $rx = $this->draft([['name' => 'Paracetamol', 'dosage' => '650mg', 'frequency' => 'QDS', 'duration' => '3d']]);
        [$otherUser] = $this->doctor('b');
        Sanctum::actingAs($otherUser);

        $this->postJson("/api/prescriptions/{$rx->id}/approve")->assertStatus(403);
        $this->assertFalse((bool) $rx->fresh()->doctor_approved);
    }

    // ------------------------------------------------------------------ draft

    public function test_per_medicine_instructions_are_saved(): void
    {
        // Regression: validation used to drop `instructions`, so "Post meals" vanished on save.
        Sanctum::actingAs($this->authorUser);
        $this->postJson('/api/prescriptions', [
            'encounter_id' => $this->encounter->id,
            'medicines' => [['name' => 'Paracetamol', 'dosage' => '650mg', 'frequency' => 'QDS', 'duration' => '3d', 'instructions' => 'Post meals']],
        ])->assertOk();

        $this->assertSame('Post meals', Prescription::first()->medicines[0]['instructions']);
    }
}
