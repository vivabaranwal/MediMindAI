<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentAssessmentRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'triage_level' => 'required|string',
            'chief_complaint' => 'required|string',
            // Change these to allow nulls if the form isn't fully filled out
            'vitals.bp' => 'nullable|string',
            'vitals.hr' => 'nullable|numeric',
            'vitals.temp' => 'nullable|numeric',
            'vitals.spo2' => 'nullable|numeric',
            
            // Ensure soap_note structure is handled if present
            'soap_note' => 'nullable|array',
            'symptoms' => 'nullable|array',
        ];
    }
}
