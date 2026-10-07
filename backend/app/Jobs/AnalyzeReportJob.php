<?php

namespace App\Jobs;

use App\Models\Report;
use App\Services\Ai\ReportAnalysisService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class AnalyzeReportJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 240;

    public function __construct(public int $reportId)
    {
        $this->onQueue(config('ai.report_queue'));
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(ReportAnalysisService $service): void
    {
        $report = Report::find($this->reportId);
        if (! $report) {
            return; // deleted since upload
        }

        // analyze() records terminal outcomes itself and only throws for transient AI failures,
        // which is exactly when the queue should retry.
        $service->analyze($report);
    }

    public function failed(Throwable $e): void
    {
        if ($report = Report::find($this->reportId)) {
            app(ReportAnalysisService::class)->markExhausted($report);
        }
    }
}
