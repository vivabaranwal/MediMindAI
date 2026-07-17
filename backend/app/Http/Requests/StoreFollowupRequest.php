<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFollowupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'encounter_id' => ['required', 'integer', 'exists:encounters,id'],
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'medium' => ['required', 'string', 'in:whatsapp,sms,email,call'],
            'questions' => ['nullable', 'array'],
        ];
    }
}
