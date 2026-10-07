<?php

namespace App\Services\Ai;

use App\Exceptions\AiConsentRequiredException;
use App\Exceptions\AiServiceException;
use App\Models\Report;
use App\Services\AIGatewayService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ReportAnalysisService
{
    public const PENDING = 'pending_analysis';
    public const ANALYZING = 'analyzing';
    public const ANALYZED = 'analyzed';
    public const FAILED = 'failed';
    public const NOT_ANALYZED = 'not_analyzed';

    public function __construct(
        private AIGatewayService $ai,
        private ConsentService $consent,
    ) {
    }

    /**
     * Run extraction/OCR + structuring + indexing for one stored report.
     *
     * Terminal problems (unreadable file, no consent) are recorded on the report and
     * return normally. Transient AI failures are re-thrown so the queue retries.
     */
    public function analyze(Report $report): Report
    {
        $report->loadMissing('patient');

        try {
            $this->consent->assertAiConsent($report->patient);
        } catch (AiConsentRequiredException) {
            return $this->markStopped($report, self::NOT_ANALYZED, 'ai_consent_required');
        }

        if (! Storage::exists($report->file_path)) {
            return $this->markStopped($report, self::FAILED, 'file_missing');
        }

        $report->update(['status' => self::ANALYZING, 'analysis_error' => null]);

        try {
            $result = $this->ai->ingestReport(
                Storage::get($report->file_path),
                $report->file_name,
                $report->id,
                $report->patient_id,
                $report->encounter_id,
            );
        } catch (AiServiceException $e) {
            if ($e->isRetryable()) {
                $report->update(['status' => self::PENDING]);
                throw $e;
            }

            Log::warning('[report] analysis rejected', ['report_id' => $report->id, 'code' => $e->errorCode]);
            return $this->markStopped($report, self::FAILED, $e->errorCode);
        }

        $warnings = [];
        if ($this->nameMismatch($report->patient->name, $result['patient_name_detected'] ?? null)) {
            $warnings[] = 'patient_name_mismatch';
        }
        if (! empty($result['extraction']['low_confidence_pages'])) {
            $warnings[] = 'low_confidence_ocr';
        }

        $report->update([
            'status' => self::ANALYZED,
            'analysis_error' => null,
            'ai_processed' => true,
            'ai_processed_at' => now(),
            'ai_summary' => $result['summary'],
            'llm_model_used' => $result['meta']['model'] ?? null,
            'ai_findings' => [
                'document_type' => $result['document_type'],
                'report_date' => $result['report_date'],
                'patient_name_detected' => $result['patient_name_detected'],
                'values' => $result['values'],
                'abnormalities' => $result['abnormalities'],
                'observations' => $result['observations'],
                'extraction' => $result['extraction'],
                'chunks_indexed' => $result['chunks_indexed'],
                'warnings' => $warnings,
            ],
        ]);

        return $report->fresh();
    }

    /** Called when the queue has exhausted its retries. */
    public function markExhausted(Report $report): void
    {
        $this->markStopped($report, self::FAILED, 'ai_unavailable');
    }

    private function markStopped(Report $report, string $status, string $reason): Report
    {
        $report->update(['status' => $status, 'analysis_error' => $reason, 'ai_processed' => false]);

        return $report->fresh();
    }

    /**
     * A report whose printed patient name shares no word with the registered name was
     * probably attached to the wrong patient. Misses are safe (no warning); only an
     * obvious mismatch warns.
     */
    private function nameMismatch(string $registered, ?string $detected): bool
    {
        if ($detected === null || trim($detected) === '') {
            return false;
        }

        $tokens = fn (string $s) => collect(preg_split('/[^\p{L}]+/u', mb_strtolower($s), -1, PREG_SPLIT_NO_EMPTY))
            ->reject(fn ($t) => mb_strlen($t) < 2 || in_array($t, ['mr', 'mrs', 'ms', 'dr', 'shri', 'smt'], true));

        return $tokens($registered)->intersect($tokens($detected))->isEmpty();
    }
}
