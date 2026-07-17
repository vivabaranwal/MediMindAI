<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOutcomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'followup_id' => ['nullable', 'integer', 'exists:followups,id'],
            'encounter_id' => ['required', 'integer', 'exists:encounters,id'],
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'treatment_worked' => ['required', 'string', 'in:improved,no_change,worsened'],
            'symptom_scores' => ['nullable', 'array'],
            'side_effects' => ['nullable', 'array'],
            'patient_notes' => ['nullable', 'string'],
        ];
    }
}
