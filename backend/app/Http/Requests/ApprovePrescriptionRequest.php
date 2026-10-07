<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApprovePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // The doctor has reviewed critical allergy alerts and chooses to prescribe anyway.
            'acknowledge_critical' => ['nullable', 'boolean'],
        ];
    }
}
