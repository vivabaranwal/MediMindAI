<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Known default passwords are for local development only. Elsewhere the password
     * must be supplied explicitly, so a seeded production database never has a
     * guessable account.
     */
    private function password(string $envKey): string
    {
        $configured = env($envKey);
        if ($configured) {
            return $configured;
        }
        if (app()->environment(['local', 'testing'])) {
            return 'password123';
        }
        throw new \RuntimeException("Set {$envKey} before seeding in this environment.");
    }

    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@medimind.ai'],
            [
                'name' => 'Super Admin',
                'mobile' => '+919999999999',
                'password' => Hash::make($this->password('SEED_ADMIN_PASSWORD')),
                'role' => UserRole::SuperAdmin->value,
                'status' => 'active',
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        $admin->assignRole('super_admin');
    }
}
