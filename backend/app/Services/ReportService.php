<?php

namespace App\Services;

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

        return $this->reportRepository->create($reportData);
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
