<?php

namespace Tests\Unit;

use App\Services\Clinical\VitalsChecker;
use PHPUnit\Framework\TestCase;

class VitalsCheckerTest extends TestCase
{
    private function alerts(array $vitals, ?int $age = 30): array
    {
        return (new VitalsChecker())->check($vitals, $age);
    }

    public function test_normal_adult_vitals_raise_nothing(): void
    {
        $this->assertSame([], $this->alerts(['bp' => '120/80', 'hr' => 72.0, 'temp' => 98.6, 'spo2' => 98.0]));
    }

    public function test_critically_low_spo2_is_flagged_and_says_to_recheck(): void
    {
        $alerts = $this->alerts(['spo2' => 76.0]);
        $this->assertCount(1, $alerts);
        $this->assertStringContainsString('critically low', $alerts[0]);
        $this->assertStringContainsString('Recheck', $alerts[0]);
    }

    public function test_mildly_low_spo2_and_impossible_values(): void
    {
        $this->assertStringContainsString('below the normal range', $this->alerts(['spo2' => 92.0])[0]);
        $this->assertStringContainsString('not a valid reading', $this->alerts(['spo2' => 140.0])[0]);
    }

    public function test_implausible_blood_pressure_is_called_a_probable_entry_error(): void
    {
        $this->assertStringContainsString('implausible', $this->alerts(['bp' => '118/30'])[0]);
        $this->assertStringContainsString('entry error', $this->alerts(['bp' => '80/120'])[0]);
    }

    public function test_blood_pressure_bands(): void
    {
        $this->assertStringContainsString('low', $this->alerts(['bp' => '85/55'])[0]);
        $this->assertStringContainsString('elevated', $this->alerts(['bp' => '150/95'])[0]);
        $this->assertStringContainsString('severely elevated', $this->alerts(['bp' => '190/115'])[0]);
    }

    public function test_heart_rate_and_temperature_in_either_unit(): void
    {
        $this->assertStringContainsString('above', $this->alerts(['hr' => 130.0])[0]);
        $this->assertStringContainsString('below', $this->alerts(['hr' => 40.0])[0]);
        $this->assertStringContainsString('fever', $this->alerts(['temp' => 101.2])[0]);
        $this->assertStringContainsString('fever', $this->alerts(['temp' => 38.9])[0]); // Celsius
        $this->assertSame([], $this->alerts(['temp' => 37.0]));
    }

    public function test_adult_ranges_are_not_applied_to_children_or_unknown_age(): void
    {
        $this->assertStringContainsString('not applied', $this->alerts(['spo2' => 76.0], 9)[0]);
        $this->assertStringContainsString('not applied', $this->alerts(['spo2' => 76.0], null)[0]);
        $this->assertSame([], (new VitalsChecker())->check(null, 30));
    }
}
