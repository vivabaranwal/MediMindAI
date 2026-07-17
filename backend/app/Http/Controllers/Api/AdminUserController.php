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
}
