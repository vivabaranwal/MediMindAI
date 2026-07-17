<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIGatewayService
{
    private string $baseUrl;
    private string $internalSecret;

    public function __construct()
    {
        $this->baseUrl = config('services.fastapi.url', 'http://localhost:8000');
        $this->internalSecret = config('services.fastapi.secret', 'secret');
    }

    private function headers(): array
    {
        return [
            'X-Internal-Secret' => $this->internalSecret,
            'Content-Type'      => 'application/json',
        ];
    }

    public function generateDoctorBrief(int $encounterId): array
    {
        $encounter = \App\Models\Encounter::with(['appointment', 'symptom'])->find($encounterId);
        if (!$encounter) {
            throw new \Exception('Encounter not found.');
        }

        $chiefComplaint = $encounter->appointment->chief_complaint ?? '';
        $symptomsData = $encounter->symptom ? $encounter->symptom->symptoms : null;
        $vitals = $symptomsData['vitals'] ?? null;
        $questions = $symptomsData['questions'] ?? [];

        $symptomsList = [];
        foreach ($questions as $q) {
            if (!empty($q['answer'])) {
                $symptomsList[] = "{$q['text']} -> {$q['answer']}";
            }
        }

        $response = Http::withHeaders($this->headers())
            ->timeout(60)
            ->post("{$this->baseUrl}/api/ai/generate-brief", [
                'encounter_id' => $encounterId,
                'chief_complaint' => $chiefComplaint,
                'vitals' => $vitals,
                'symptoms' => $symptomsList,
            ]);

        if ($response->failed()) {
            Log::error('AI Brief generation failed', [
                'encounter_id' => $encounterId,
                'response_body' => $response->body()
            ]);
            throw new \Exception('AI service unavailable');
        }

        return $response->json();
    }

    public function analyzeReport(int $reportId): array
    {
        $response = Http::withHeaders($this->headers())
            ->timeout(120)
            ->post("{$this->baseUrl}/api/ai/analyze-report", [
                'report_id' => $reportId,
            ]);

        if ($response->failed()) {
            Log::error('AI Report Analysis failed', ['report_id' => $reportId]);
            throw new \Exception('AI report analysis service failed');
        }

        return $response->json();
    }

    public function generateSoap(int $encounterId): array
    {
        $response = Http::withHeaders($this->headers())
            ->timeout(60)
            ->post("{$this->baseUrl}/api/ai/generate-soap", [
                'encounter_id' => $encounterId,
            ]);

        if ($response->failed()) {
            Log::error('AI SOAP generation failed', ['encounter_id' => $encounterId]);
            throw new \Exception('AI SOAP service failed');
        }

        return $response->json();
    }
}
