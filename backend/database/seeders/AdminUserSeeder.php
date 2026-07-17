<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@medimind.ai'],
            [
                'name' => 'Super Admin',
                'mobile' => '+919999999999',
                'password' => Hash::make('password123'),
                'role' => UserRole::SuperAdmin->value,
                'status' => 'active',
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        $admin->assignRole('super_admin');
    }
}
