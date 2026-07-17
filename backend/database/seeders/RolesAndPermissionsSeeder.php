<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            'manage_users',
            'view_all_patients',
            'view_own_record',
            'book_appointment',
            'approve_prescription',
            'access_ai_tools',
            'view_analytics',
            'manage_qdrant',
        ];

        $guards = ['web', 'api'];

        foreach ($guards as $guard) {
            $permissionModels = [];
            foreach ($permissions as $permission) {
                $permissionModels[$permission] = Permission::firstOrCreate([
                    'name' => $permission,
                    'guard_name' => $guard
                ]);
            }

            // Define roles and their permissions
            $rolesWithPermissions = [
                'patient' => ['view_own_record', 'book_appointment'],
                'front_desk' => ['view_all_patients', 'view_own_record', 'book_appointment'],
                'doctor' => ['view_all_patients', 'view_own_record', 'approve_prescription', 'access_ai_tools', 'view_analytics'],
                'clinic_admin' => ['manage_users', 'view_all_patients', 'view_own_record', 'book_appointment', 'view_analytics'],
                'super_admin' => $permissions,
            ];

            foreach ($rolesWithPermissions as $roleName => $rolePerms) {
                $role = Role::firstOrCreate([
                    'name' => $roleName,
                    'guard_name' => $guard
                ]);

                $permissionIds = [];
                foreach ($rolePerms as $permName) {
                    if (isset($permissionModels[$permName])) {
                        $permissionIds[] = $permissionModels[$permName]->id;
                    }
                }

                // Sync directly using database relations to bypass Spatie cache during seeding
                $role->permissions()->sync($permissionIds);
            }
        }

        // Clear cache at the end
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
