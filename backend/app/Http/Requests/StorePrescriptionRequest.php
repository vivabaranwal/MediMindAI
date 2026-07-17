<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'encounter_id' => ['required', 'integer', 'exists:encounters,id'],
            'medicines' => ['required', 'array'],
            'medicines.*.name' => ['required', 'string'],
            'medicines.*.dosage' => ['required', 'string'],
            'medicines.*.frequency' => ['required', 'string'],
            'medicines.*.duration' => ['required', 'string'],
            'instructions' => ['nullable', 'string'],
            'followup_date' => ['nullable', 'date'],
        ];
    }
}
