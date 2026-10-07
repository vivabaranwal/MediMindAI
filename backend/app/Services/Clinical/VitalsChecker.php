<?php

namespace App\Services\Clinical;

/**
 * Deterministic vitals screening against adult reference ranges.
 *
 * Runs in the system of record so abnormal vitals are surfaced to the doctor (and to the
 * chat model as part of the chart) whether or not the model remembers to mention them.
 * It flags; it never diagnoses. Values that are physiologically implausible are called
 * out as probable entry or probe errors that must be rechecked, not accepted as true.
 *
 * Adult ranges only: for a patient under 18, or of unknown age, no range is applied.
 */
class VitalsChecker
{
    /**
     * @param  array{bp?: string, hr?: float, temp?: float, spo2?: float}|null  $vitals
     * @return string[] one human-readable alert per abnormal value
     */
    public function check(?array $vitals, ?int $age): array
    {
        if (! $vitals) {
            return [];
        }
        if ($age === null || $age < 18) {
            return ['Adult vitals ranges were not applied (patient is under 18 or age is not documented); interpret vitals manually.'];
        }

        $alerts = [];

        if (isset($vitals['spo2'])) {
            $s = (float) $vitals['spo2'];
            if ($s > 100 || $s <= 0) {
                $alerts[] = "SpO2 {$this->n($s)} is not a valid reading; recheck.";
            } elseif ($s < 90) {
                $alerts[] = "SpO2 {$this->n($s)}% is critically low (adult normal 95-100%). Recheck immediately (probe placement, perfusion); if confirmed this needs urgent evaluation and takes priority over the presenting complaint.";
            } elseif ($s < 94) {
                $alerts[] = "SpO2 {$this->n($s)}% is below the normal range (95-100%); recheck.";
            }
        }

        if (isset($vitals['bp']) && preg_match('/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/', (string) $vitals['bp'], $m)) {
            [$sys, $dia] = [(int) $m[1], (int) $m[2]];
            if ($dia >= $sys) {
                $alerts[] = "BP {$sys}/{$dia}: diastolic is not below systolic; probable entry error, recheck.";
            } elseif ($sys - $dia > 100 || $dia < 40) {
                $alerts[] = "BP {$sys}/{$dia} is physiologically implausible (very wide pulse pressure / very low diastolic); probable entry or measurement error, recheck manually.";
            } elseif ($sys < 90 || $dia < 50) {
                $alerts[] = "BP {$sys}/{$dia} is low; recheck and assess for hypotension.";
            } elseif ($sys >= 180 || $dia >= 110) {
                $alerts[] = "BP {$sys}/{$dia} is severely elevated; recheck.";
            } elseif ($sys >= 140 || $dia >= 90) {
                $alerts[] = "BP {$sys}/{$dia} is elevated.";
            }
        }

        if (isset($vitals['hr'])) {
            $hr = (float) $vitals['hr'];
            if ($hr > 100) {
                $alerts[] = "Heart rate {$this->n($hr)} is above the adult resting range (60-100).";
            } elseif ($hr < 50) {
                $alerts[] = "Heart rate {$this->n($hr)} is below the adult resting range (60-100).";
            }
        }

        if (isset($vitals['temp'])) {
            $t = (float) $vitals['temp'];
            $fahrenheit = $t >= 50 ? $t : $t * 9 / 5 + 32; // a value below 50 can only be Celsius
            if ($fahrenheit >= 100.4) {
                $alerts[] = "Temperature {$this->n($t)} indicates fever.";
            } elseif ($fahrenheit < 95) {
                $alerts[] = "Temperature {$this->n($t)} is low; recheck.";
            }
        }

        return $alerts;
    }

    private function n(float $v): string
    {
        return rtrim(rtrim(number_format($v, 1, '.', ''), '0'), '.');
    }
}
