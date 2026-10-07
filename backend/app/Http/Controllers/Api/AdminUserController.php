<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateAdminUserRequest;
use App\Services\AdminUserService;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    protected AdminUserService $adminUserService;

    public function __construct(AdminUserService $adminUserService)
    {
        $this->adminUserService = $adminUserService;
    }

    public function index(): JsonResponse
    {
        $users = $this->adminUserService->getAllUsers();
        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $user = $this->adminUserService->createUser($request->validated());
        return response()->json([
            'success' => true,
            'message' => 'Staff user created successfully.',
            'data' => $user,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $this->guardSuperAdminTarget($id);
        $user = $this->adminUserService->getUserById($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }
        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(UpdateAdminUserRequest $request, int $id): JsonResponse
    {
        $this->guardSuperAdminTarget($id);
        $user = $this->adminUserService->updateUser($id, $request->validated());
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }
        return response()->json([
            'success' => true,
            'message' => 'Staff user updated successfully.',
            'data' => $user,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->guardSuperAdminTarget($id);
        abort_if($id === auth()->id(), 422, 'You cannot delete your own account.');
        $deleted = $this->adminUserService->deleteUser($id);
        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'User not found or could not be deleted.',
            ], 404);
        }
        return response()->json([
            'success' => true,
            'message' => 'Staff user deleted successfully.',
        ]);
    }

    /**
     * A clinic admin must not be able to read, edit or delete a super admin account.
     */
    private function guardSuperAdminTarget(int $id): void
    {
        $target = \App\Models\User::find($id);
        if ($target && $target->role === 'super_admin' && !auth()->user()?->hasRole('super_admin')) {
            abort(403, 'Only a super admin can manage this account.');
        }
    }
}
