<?php

namespace App\Services\Ai;

use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Report;
use App\Models\Symptom;
use App\Services\Clinical\VitalsChecker;

/**
 * Turns database records into the payloads the AI engine expects. This is the single
 * definition of "what the AI knows about this patient" for briefs, SOAP drafts,
 * suggestions and chat, so they can never drift apart.
 *
 * Nothing is defaulted or invented: missing data is omitted and the engine labels it
 * "Not documented".
 */
class EncounterContextBuilder
{
    private const MAX_QA = 60;
    private const MAX_REPORTS = 10;

    public function __construct(private VitalsChecker $vitalsChecker)
    {
    }

    public function patientFacts(Patient $patient): array
    {
        $patient->loadMissing('allergies');

        return [
            'age' => $patient->age ?? ($patient->date_of_birth?->age),
            'gender' => $patient->gender ? strtolower($patient->gender) : null,
            'allergies' => $patient->allergies->pluck('allergen')->filter()->values()->all(),
            'current_medications' => $this->strings($patient->current_medications),
            'medical_history' => $this->strings($patient->medical_history),
        ];
    }

    public function vitals(?Symptom $symptom): ?array
    {
        return $this->normalizeVitals($symptom?->symptoms['vitals'] ?? null);
    }

    /** Coerce vitals from any client shape to numbers; drop anything unreadable. */
    public function normalizeVitals(mixed $v): ?array
    {
        if (! is_array($v)) {
            return null;
        }

        $vitals = array_filter([
            'bp' => isset($v['bp']) && $v['bp'] !== '' ? (string) $v['bp'] : null,
            'hr' => $this->number($v['hr'] ?? null),
            'temp' => $this->number($v['temp'] ?? null),
            'spo2' => $this->number($v['spo2'] ?? null),
        ], fn ($x) => $x !== null);

        return $vitals ?: null;
    }

    /** Answered intake questions, excluding any the junior doctor rejected. */
    public function qa(?Symptom $symptom): array
    {
        $questions = $symptom?->symptoms['questions'] ?? [];
        $qa = [];
        foreach ($questions as $q) {
            $answer = trim((string) ($q['answer'] ?? ''));
            if ($answer === '' || ($q['status'] ?? '') === 'rejected') {
                continue;
            }
            $qa[] = ['question' => (string) ($q['text'] ?? ''), 'answer' => $answer];
        }

        return array_slice($qa, 0, self::MAX_QA);
    }

    /** One-line digests of analysed reports for the prompt. */
    public function reportSummaries(Patient $patient): array
    {
        return $this->analysedReports($patient)
            ->map(function (Report $r) {
                $type = $r->report_type instanceof \BackedEnum ? $r->report_type->value : (string) $r->report_type;
                $abn = $r->ai_findings['abnormalities'] ?? [];
                $line = sprintf('%s (uploaded %s): %s', $type, $r->uploaded_at?->toDateString() ?? 'n/a', $r->ai_summary);
                if ($abn) {
                    $line .= ' Abnormal: ' . implode('; ', array_slice($abn, 0, 8));
                }
                return $line;
            })
            ->values()->all();
    }

    /** Payload shared by brief / SOAP / suggestions. */
    public function forEncounter(Encounter $encounter): array
    {
        $encounter->loadMissing(['patient.allergies', 'appointment', 'symptom']);

        return [
            'encounter_id' => $encounter->id,
            'chief_complaint' => (string) ($encounter->appointment?->chief_complaint ?? ''),
            'patient' => $this->patientFacts($encounter->patient),
            'vitals' => $this->vitals($encounter->symptom),
            'qa' => $this->qa($encounter->symptom),
            'report_summaries' => $this->reportSummaries($encounter->patient),
        ];
    }

    /**
     * Narrative chart for chat. This is the authoritative-record source the model may
     * cite as [chart]; report excerpts are retrieved separately by the engine.
     */
    public function chartContext(Encounter $encounter): string
    {
        $encounter->loadMissing(['patient.allergies', 'appointment', 'symptom', 'soapNote']);
        $p = $encounter->patient;
        $facts = $this->patientFacts($p);
        $lines = [];

        $lines[] = sprintf('Patient: %s, age %s, %s.', $p->name, $facts['age'] ?? 'not documented', $facts['gender'] ?? 'gender not documented');
        if ($encounter->appointment?->triage_level) {
            $lines[] = 'Triage level: ' . $encounter->appointment->triage_level . '.';
        }
        $lines[] = 'Chief complaint: ' . ($encounter->appointment?->chief_complaint ?: 'not documented') . '.';

        if ($vitals = $this->vitals($encounter->symptom)) {
            $lines[] = 'Vitals: ' . implode(', ', array_map(fn ($k, $v) => strtoupper($k) . " $v", array_keys($vitals), $vitals)) . '.';
            // Deterministic, so abnormal vitals reach the doctor even if the model does not raise them.
            foreach ($this->vitalsChecker->check($vitals, $facts['age'] !== null ? (int) $facts['age'] : null) as $alert) {
                $lines[] = 'VITALS ALERT: ' . $alert;
            }
        } else {
            $lines[] = 'Vitals: not documented.';
        }

        $allergyLines = $p->allergies->map(fn ($a) => trim("{$a->allergen}" . ($a->reaction ? " (reaction: {$a->reaction})" : '') . ($a->severity ? " [severity: {$a->severity}]" : '')))->all();
        $lines[] = 'Allergies: ' . ($allergyLines ? implode('; ', $allergyLines) : 'none documented') . '.';
        $lines[] = 'Current medications: ' . ($facts['current_medications'] ? implode(', ', $facts['current_medications']) : 'none documented') . '.';
        $lines[] = 'Medical history: ' . ($facts['medical_history'] ? implode(', ', $facts['medical_history']) : 'none documented') . '.';

        $qa = $this->qa($encounter->symptom);
        if ($qa) {
            $lines[] = 'Intake answers:';
            foreach ($qa as $item) {
                $lines[] = "- {$item['question']} -> {$item['answer']}";
            }
        }

        if ($note = $encounter->soapNote) {
            $status = $note->doctor_signed ? 'signed' : 'draft';
            $lines[] = "SOAP note ({$status}): Subjective: {$note->subjective} | Objective: {$note->objective} | Assessment: {$note->assessment} | Plan: {$note->plan}";
        }

        return implode("\n", $lines);
    }

    private function analysedReports(Patient $patient)
    {
        return $patient->reports()
            ->where('ai_processed', true)
            ->whereNotNull('ai_summary')
            ->orderByDesc('uploaded_at')
            ->limit(self::MAX_REPORTS)
            ->get();
    }

    private function strings(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true) ?? [$value];
        }

        return collect(is_array($value) ? $value : [])->map(fn ($x) => trim((string) $x))->filter()->values()->all();
    }

    private function number(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        // "98.6 °F" style strings from older client builds
        return preg_match('/-?\d+(?:\.\d+)?/', (string) $value, $m) ? (float) $m[0] : null;
    }
}
