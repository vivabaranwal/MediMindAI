<?php

namespace App\Services;

use App\Jobs\AnalyzeReportJob;
use App\Models\Report;
use App\Repositories\Contracts\ReportRepositoryInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ReportService
{
    protected ReportRepositoryInterface $reportRepository;

    public function __construct(ReportRepositoryInterface $reportRepository)
    {
        $this->reportRepository = $reportRepository;
    }

    /**
     * Upload and record a new medical report.
     */
    public function uploadReport(UploadedFile $file, array $data, int $uploadedByUserId): Report
    {
        // Store file inside 'reports' disk directory
        $path = $file->store('reports');

        $reportData = [
            'patient_id' => $data['patient_id'],
            'encounter_id' => $data['encounter_id'] ?? null,
            'report_type' => $data['report_type'],
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getClientMimeType(),
            'uploaded_by' => $uploadedByUserId,
            'status' => 'pending_analysis',
            'ai_processed' => false,
            'uploaded_at' => now(),
        ];

        $report = $this->reportRepository->create($reportData);

        AnalyzeReportJob::dispatch($report->id)->afterCommit();

        return $report;
    }

    /**
     * Permanently delete a report: its derived search index entries first, then the file and record.
     *
     * If the report was analysed its text was indexed in the AI engine; deleting the record while leaving
     * that derived copy behind would defeat the deletion, so the delete is refused if the engine cannot
     * confirm the purge (AiServiceException propagates and nothing is removed).
     */
    public function deleteReport(Report $report): void
    {
        if ($report->ai_processed) {
            app(\App\Services\AIGatewayService::class)->deleteReport($report->id);
        }

        Storage::delete($report->file_path);
        $report->delete();
    }

    /**
     * Find a report by ID.
     */
    public function getReport(int $id): ?Report
    {
        return $this->reportRepository->find($id);
    }

    /**
     * List reports by patient ID.
     */
    public function getReportsForPatient(int $patientId)
    {
        return $this->reportRepository->findByPatientId($patientId);
    }
}
