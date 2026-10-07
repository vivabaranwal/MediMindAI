<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Real operational numbers for the admin console (replaces hardcoded sample data).
 */
class AdminOverviewController extends Controller
{
    public function overview(): JsonResponse
    {
        $reportsByStatus = Report::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'success' => true,
            'data' => [
                'active_users' => User::where('status', 'active')->count(),
                'staff_by_role' => User::where('status', 'active')->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role'),
                'patients' => Patient::count(),
                'appointments_today' => Appointment::whereDate('appointment_date', today())->count(),
                'reports_by_status' => $reportsByStatus,
                'reports_needing_attention' => ($reportsByStatus['failed'] ?? 0) + ($reportsByStatus['not_analyzed'] ?? 0),
                'audit_events_24h' => AuditLog::where('created_at', '>=', now()->subDay())->count(),
            ],
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $request->validate(['per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);

        $page = AuditLog::with('user:id,name,role')
            ->orderByDesc('id')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => collect($page->items())->map(fn (AuditLog $l) => [
                'id' => $l->id,
                'time' => $l->created_at?->toDateTimeString(),
                'user' => $l->user?->name,
                'role' => $l->user?->role,
                'action' => $l->action,
                'resource' => $l->resource_type,
                'resource_id' => $l->resource_id,
                'fields' => $l->new_values,
                'ip' => $l->ip_address,
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }
}
