<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    /**
     * Active doctors, for queue filters and the junior-to-senior handoff.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['level' => ['nullable', 'in:junior,senior']]);

        $doctors = Doctor::with('user:id,name')
            ->where('is_active', true)
            ->when($request->query('level'), fn ($q, $level) => $q->where('level', $level))
            ->get()
            ->map(fn (Doctor $d) => [
                'id' => $d->id,
                'name' => $d->user?->name,
                'specialization' => $d->specialization,
                'level' => $d->level,
            ])
            ->sortBy('name')
            ->values();

        return response()->json(['success' => true, 'data' => $doctors]);
    }
}
