<?php

namespace App\Services;

use App\Models\SoapNote;
use App\Models\Encounter;
use App\Repositories\Contracts\SoapNoteRepositoryInterface;
use Illuminate\Validation\ValidationException;
use App\Services\Ai\ConsentService;
use App\Services\Ai\EncounterContextBuilder;

class SoapNoteService
{
    public function __construct(
        protected SoapNoteRepositoryInterface $soapNoteRepository,
        protected AIGatewayService $aiGatewayService,
        protected EncounterContextBuilder $context,
        protected ConsentService $consent,
    ) {
    }

    /**
     * The stored SOAP note for an encounter (draft or signed), or null. Never generates.
     */
    public function getSoapNoteForEncounter(int $encounterId): ?SoapNote
    {
        return $this->soapNoteRepository->findByEncounterId($encounterId);
    }

    /**
     * Draft a SOAP note with AI from the encounter's current data.
     *
     * A signed note is immutable. An existing unsigned note is replaced; if a doctor wrote
     * it (not AI-generated) their text is passed to the model as priority input.
     *
     * @throws ValidationException when the note is already signed
     * @throws \App\Exceptions\AiConsentRequiredException
     * @throws \App\Exceptions\AiServiceException  nothing is stored if the AI call fails
     */
    public function generateDraft(int $encounterId): SoapNote
    {
        $encounter = Encounter::with('patient')->findOrFail($encounterId);
        $this->consent->assertAiConsent($encounter->patient);

        $existing = $this->soapNoteRepository->findByEncounterId($encounterId);
        if ($existing && $existing->doctor_signed) {
            throw ValidationException::withMessages([
                'soap_note' => ['A signed SOAP note cannot be regenerated.'],
            ]);
        }

        $payload = $this->context->forEncounter($encounter);
        if ($existing && !$existing->is_ai_generated) {
            $payload['clinician_notes'] = trim(implode("
", array_filter([
                $existing->subjective, $existing->objective, $existing->assessment, $existing->plan,
            ])));
        }

        $ai = $this->aiGatewayService->soap($payload);
        $fields = [
            'subjective' => $ai['subjective'],
            'objective' => $ai['objective'],
            'assessment' => $ai['assessment'],
            'plan' => $ai['plan'],
            'is_ai_generated' => true,
            'doctor_signed' => false,
        ];

        if ($existing) {
            $this->soapNoteRepository->update($existing->id, $fields);
            return $existing->fresh();
        }

        $note = $this->soapNoteRepository->create($fields + [
            'encounter_id' => $encounterId,
            'patient_id' => $encounter->patient_id,
            'doctor_id' => $encounter->doctor_id,
        ]);
        $encounter->update(['soap_note_id' => $note->id]);

        return $note;
    }

    /**
     * Save draft SOAP note. Enforces immutability check.
     */
    public function saveDraft(int $encounterId, array $data, int $doctorId): SoapNote
    {
        $soapNote = $this->soapNoteRepository->findByEncounterId($encounterId);

        if ($soapNote && $soapNote->doctor_signed) {
            throw ValidationException::withMessages([
                'soap_note' => ['A signed SOAP note cannot be modified.'],
            ]);
        }

        if (!$soapNote) {
            $encounter = Encounter::find($encounterId);
            if (!$encounter) {
                throw new \Exception('Encounter not found.');
            }

            $data['encounter_id'] = $encounterId;
            $data['patient_id'] = $encounter->patient_id;
            $data['doctor_id'] = $doctorId;
            $data['doctor_signed'] = false;

            $soapNote = $this->soapNoteRepository->create($data);

            // Link it back to the encounter
            $encounter->update(['soap_note_id' => $soapNote->id]);
        } else {
            $this->soapNoteRepository->update($soapNote->id, $data);
            $soapNote = $soapNote->fresh();
        }

        return $soapNote;
    }

    /**
     * Digtially sign SOAP note.
     */
    public function signSoapNote(int $soapNoteId, int $doctorId): SoapNote
    {
        $soapNote = $this->soapNoteRepository->find($soapNoteId);
        if (!$soapNote) {
            throw new \Exception('SOAP note not found.');
        }

        if ($soapNote->doctor_signed) {
            throw ValidationException::withMessages([
                'soap_note' => ['This SOAP note is already signed.'],
            ]);
        }

        $this->soapNoteRepository->update($soapNote->id, [
            'doctor_signed' => true,
            'signed_at' => now(),
        ]);

        return $soapNote->fresh();
    }
}
