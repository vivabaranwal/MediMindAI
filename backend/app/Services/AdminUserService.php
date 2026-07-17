<?php

namespace App\Services;

use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminUserService
{
    protected UserRepositoryInterface $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function getAllUsers()
    {
        return $this->userRepository->all();
    }

    public function getUserById(int $id)
    {
        return $this->userRepository->find($id);
    }

    public function createUser(array $data)
    {
        $userData = [
            'name' => $data['name'],
            'email' => $data['email'],
            'mobile' => $data['mobile'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'status' => $data['status'] ?? 'active',
        ];

        $user = $this->userRepository->create($userData);
        $user->syncRoles($data['role']);

        if ($data['role'] === 'doctor') {
            \App\Models\Doctor::firstOrCreate([
                'user_id' => $user->id,
            ], [
                'registration_number' => 'DOC-' . uniqid(),
                'specialization' => 'General Medicine',
                'is_active' => true,
            ]);
        }

        return $user;
    }

    public function updateUser(int $id, array $data)
    {
        $user = $this->userRepository->find($id);
        if (!$user) {
            return null;
        }

        $updateData = [];
        if (isset($data['name'])) $updateData['name'] = $data['name'];
        if (isset($data['email'])) $updateData['email'] = $data['email'];
        if (isset($data['mobile'])) $updateData['mobile'] = $data['mobile'];
        if (isset($data['role'])) $updateData['role'] = $data['role'];
        if (isset($data['status'])) $updateData['status'] = $data['status'];

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $this->userRepository->update($id, $updateData);
        
        $user = $user->fresh();

        if (isset($data['role'])) {
            $user->syncRoles($data['role']);

            if ($data['role'] === 'doctor') {
                \App\Models\Doctor::firstOrCreate([
                    'user_id' => $user->id,
                ], [
                    'registration_number' => 'DOC-' . uniqid(),
                    'specialization' => 'General Medicine',
                    'is_active' => true,
                ]);
            }
        }

        return $user;
    }

    public function deleteUser(int $id): bool
    {
        return $this->userRepository->delete($id);
    }
}
