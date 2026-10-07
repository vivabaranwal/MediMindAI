<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            // The reviewing senior doctor the junior chooses at handoff
            'doctor_id' => ['required', 'integer', Rule::exists('doctors', 'id')->where('level', 'senior')->where('is_active', true)],
            'chief_complaint' => 'required|string',
            // Change these to allow nulls if the form isn't fully filled out
            'vitals.bp' => 'nullable|string',
            'vitals.hr' => 'nullable|numeric',
            // Clients send either 98.6 or "98.6 °F"; EncounterContextBuilder normalises on read.
            'vitals.temp' => ['nullable', 'regex:/^\s*-?\d+(\.\d+)?\s*(°?\s*[FfCc])?\s*$/'],
            'vitals.spo2' => 'nullable|numeric',
            
            'symptoms' => 'nullable|array',
            // AI intake summary produced during the junior assessment (risk, red flags, notes)
            'summary' => 'nullable|array',
        ];
    }
}
