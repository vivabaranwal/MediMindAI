<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user');
        if (is_object($userId)) {
            $userId = $userId->id;
        }

        return [
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email,' . $userId],
            'mobile' => ['nullable', 'string', 'unique:users,mobile,' . $userId],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['nullable', 'string', 'in:super_admin,clinic_admin,doctor,front_desk,patient'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ];
    }
}
