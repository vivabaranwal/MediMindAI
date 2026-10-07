<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Doctor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ClinicUsersSeeder extends Seeder
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
        // 1. Seed Receptionist (Viva Baranwal)
        $receptionist = User::firstOrCreate(
            ["email" => "receptionist@medimind.ai"],
            [
                "name" => "Viva Baranwal",
                "mobile" => "9876543210",
                "password" => Hash::make($this->password('SEED_CLINIC_PASSWORD')),
                "role" => "front_desk",
                "status" => "active",
                "email_verified_at" => now(),
                "mobile_verified_at" => now(),
            ]
        );
        $receptionist->assignRole("front_desk");

        // 2. Seed Doctor 1 (Dr. Alok Verma)
        $docUser1 = User::firstOrCreate(
            ["email" => "doctor1@medimind.ai"],
            [
                "name" => "Dr. Alok Verma",
                "mobile" => "9876543211",
                "password" => Hash::make($this->password('SEED_CLINIC_PASSWORD')),
                "role" => "doctor",
                "status" => "active",
                "email_verified_at" => now(),
                "mobile_verified_at" => now(),
            ]
        );
        $docUser1->assignRole("doctor");

        $doctor1 = Doctor::firstOrCreate(
            ["registration_number" => "REG-12345"],
            [
                "user_id" => $docUser1->id,
                "specialization" => "ENT Spec. - General",
                "level" => "senior",
                "qualification" => "MBBS, MS (ENT)",
                "experience_years" => 12,
                "consultation_fee" => 500.00,
                "is_active" => true,
            ]
        );

        // 3. Seed Doctor 2 (Dr. Neha Shah)
        $docUser2 = User::firstOrCreate(
            ["email" => "doctor2@medimind.ai"],
            [
                "name" => "Dr. Neha Shah",
                "mobile" => "9876543212",
                "password" => Hash::make($this->password('SEED_CLINIC_PASSWORD')),
                "role" => "doctor",
                "status" => "active",
                "email_verified_at" => now(),
                "mobile_verified_at" => now(),
            ]
        );
        $docUser2->assignRole("doctor");

        $doctor2 = Doctor::firstOrCreate(
            ["registration_number" => "REG-67890"],
            [
                "user_id" => $docUser2->id,
                "specialization" => "Otology Spec. - Ear",
                "level" => "senior",
                "qualification" => "MBBS, DLO, MS (ENT)",
                "experience_years" => 8,
                "consultation_fee" => 600.00,
                "is_active" => true,
            ]
        );

        // 4. Seed the junior doctor (intake assessment; hands cases to a senior)
        $juniorUser = User::firstOrCreate(
            ["email" => "junior1@medimind.ai"],
            [
                "name" => "Dr. Rahul Mehta",
                "mobile" => "9876543213",
                "password" => Hash::make($this->password('SEED_CLINIC_PASSWORD')),
                "role" => "doctor",
                "status" => "active",
                "email_verified_at" => now(),
                "mobile_verified_at" => now(),
            ]
        );
        $juniorUser->assignRole("doctor");

        Doctor::firstOrCreate(
            ["registration_number" => "REG-11111"],
            [
                "user_id" => $juniorUser->id,
                "specialization" => "General Medicine - Intake",
                "level" => "junior",
                "qualification" => "MBBS",
                "experience_years" => 2,
                "consultation_fee" => 300.00,
                "is_active" => true,
            ]
        );

        // Doctors seeded before levels existed default to senior; keep the two seniors explicit.
        Doctor::whereIn("registration_number", ["REG-12345", "REG-67890"])->update(["level" => "senior"]);
    }
}
