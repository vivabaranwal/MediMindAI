<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ReportController extends Controller
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Upload medical document report.
     */
    public function upload(StoreReportRequest $request): JsonResponse
    {
        try {
            $report = $this->reportService->uploadReport(
                $request->file('file'),
                $request->validated(),
                Auth::id()
            );

            return response()->json([
                'success' => true,
                'message' => 'Report uploaded successfully.',
                'data' => $report,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display report details.
     */
    public function show(int $id): JsonResponse
    {
        $report = $this->reportService->getReport($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Display listing of reports for a patient.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
        ]);

        $reports = $this->reportService->getReportsForPatient($request->query('patient_id'));

        return response()->json([
            'success' => true,
            'data' => $reports,
        ]);
    }

    /**
     * Download the uploaded report file.
     */
    public function download(int $id)
    {
        $report = $this->reportService->getReport($id);

        if (!$report || !Storage::exists($report->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found.',
            ], 404);
        }

        return Storage::download($report->file_path, $report->file_name);
    }
}
