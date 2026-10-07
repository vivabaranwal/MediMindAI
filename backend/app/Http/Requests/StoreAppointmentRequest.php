<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
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
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'appointment_time' => ['required', 'string', 'regex:/^[0-2]\d:[0-5]\d$/'],
            'type' => ['sometimes', 'string', 'in:regular,urgent,walk_in,follow_up'],
            'triage_level' => ['sometimes', 'string', 'in:red,amber,green'],
            'chief_complaint' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
