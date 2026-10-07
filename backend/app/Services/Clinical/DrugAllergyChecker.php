<?php

namespace App\Services\Clinical;

/**
 * Deterministic drug-allergy rules. This is the single enforcement point for allergy
 * contraindications: it runs in the system of record, needs no AI consent and no
 * network call, so it works even when the AI engine is down or the patient has
 * declined AI processing. It is deliberately conservative (matches by class and by name).
 */
class DrugAllergyChecker
{
    public const CRITICAL = 'critical';
    public const WARNING = 'warning';

    /** @var array<string, string[]> class => substrings that identify a member (drug or class name) */
    private const CLASSES = [
        'penicillin' => ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'amoxiclav', 'clavulan', 'piperacillin', 'flucloxacillin', 'cloxacillin', 'benzathine'],
        'cephalosporin' => ['cef', 'ceph', 'cefuroxime', 'ceftriaxone', 'cefixime', 'cefpodoxime', 'cephalexin'],
        'sulfonamide' => ['sulfa', 'sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole', 'bactrim', 'trimethoprim'],
        'nsaid' => ['nsaid', 'ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'ketorolac', 'nimesulide', 'etoricoxib', 'aceclofenac'],
        'macrolide' => ['azithromycin', 'clarithromycin', 'erythromycin', 'macrolide'],
        'fluoroquinolone' => ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'moxifloxacin', 'quinolone'],
        'clindamycin' => ['clindamycin'],
    ];

    /** @return string[] */
    public function classesOf(string $text): array
    {
        $low = mb_strtolower($text);
        $found = [];
        foreach (self::CLASSES as $class => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($low, $needle)) {
                    $found[] = $class;
                    break;
                }
            }
        }

        return $found;
    }

    /**
     * @param  string[]  $allergies  allergen names as recorded on the patient
     * @return array<int, array{severity: string, medication: string, message: string, source: string}>
     */
    public function check(string $medication, array $allergies): array
    {
        $medClasses = $this->classesOf($medication);
        $alerts = [];

        foreach ($allergies as $allergy) {
            $allergy = trim((string) $allergy);
            if ($allergy === '') {
                continue;
            }
            $allergyClasses = $this->classesOf($allergy);
            $direct = str_contains(mb_strtolower($medication), mb_strtolower($allergy));

            if ($direct || array_intersect($medClasses, $allergyClasses)) {
                $alerts[] = [
                    'severity' => self::CRITICAL,
                    'medication' => $medication,
                    'message' => "Documented allergy ({$allergy}) conflicts with {$medication}. Contraindicated unless the allergy record is wrong.",
                    'source' => 'rule',
                ];
            } elseif (in_array('penicillin', $allergyClasses, true) && in_array('cephalosporin', $medClasses, true)) {
                $alerts[] = [
                    'severity' => self::WARNING,
                    'medication' => $medication,
                    'message' => "{$medication} is a cephalosporin and the patient has a documented penicillin allergy; cross-reactivity is possible. Confirm reaction history.",
                    'source' => 'rule',
                ];
            }
        }

        return $alerts;
    }

    /**
     * @param  string[]  $medications
     * @param  string[]  $allergies
     */
    public function checkAll(array $medications, array $allergies): array
    {
        $alerts = [];
        foreach ($medications as $medication) {
            $alerts = array_merge($alerts, $this->check($medication, $allergies));
        }

        return $alerts;
    }
}
