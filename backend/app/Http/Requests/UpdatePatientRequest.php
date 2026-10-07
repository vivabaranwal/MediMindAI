<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'age' => ['nullable', 'integer', 'min:0', 'max:150'],
            'gender' => ['nullable', 'string', 'in:Male,Female,Other'],
            'mobile' => ['sometimes', 'required', 'string', 'regex:/^\+?[1-9]\d{1,14}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'blood_group' => ['nullable', 'string', 'max:5'],
            'abha_id' => ['nullable', 'string', 'max:50'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_mobile' => ['nullable', 'string', 'regex:/^\+?[1-9]\d{1,14}$/'],
            'is_active' => ['sometimes', 'boolean'],
            'medical_history' => ['nullable', 'array', 'max:50'],
            'medical_history.*' => ['string', 'max:200'],
            'current_medications' => ['nullable', 'array', 'max:50'],
            'current_medications.*' => ['string', 'max:200'],
            'allergies' => ['nullable', 'array', 'max:30'],
            'allergies.*.allergen' => ['required', 'string', 'max:100'],
            'allergies.*.reaction' => ['nullable', 'string', 'max:200'],
            'allergies.*.severity' => ['nullable', 'string', 'in:mild,moderate,severe'],
        ];
    }
}
