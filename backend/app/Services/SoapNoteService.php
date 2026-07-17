<?php

namespace App\Services;

use App\Models\SoapNote;
use App\Models\Encounter;
use App\Repositories\Contracts\SoapNoteRepositoryInterface;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class SoapNoteService
{
    protected SoapNoteRepositoryInterface $soapNoteRepository;
    protected AIGatewayService $aiGatewayService;

    public function __construct(
        SoapNoteRepositoryInterface $soapNoteRepository,
        AIGatewayService $aiGatewayService
    ) {
        $this->soapNoteRepository = $soapNoteRepository;
        $this->aiGatewayService = $aiGatewayService;
    }

    /**
     * Get the SOAP note for a specific encounter.
     */
    public function getSoapNoteForEncounter(int $encounterId): ?SoapNote
    {
        $soapNote = $this->soapNoteRepository->findByEncounterId($encounterId);
        if (!$soapNote) {
            try {
                $encounter = Encounter::find($encounterId);
                if ($encounter) {
                    Log::info('[SoapNoteService] Generating SOAP note draft via AI', ['encounter_id' => $encounterId]);
                    $aiSoap = $this->aiGatewayService->generateSoap($encounterId);
                    
                    $soapNote = $this->soapNoteRepository->create([
                        'encounter_id' => $encounterId,
                        'patient_id' => $encounter->patient_id,
                        'doctor_id' => $encounter->doctor_id,
                        'subjective' => $aiSoap['subjective'] ?? '',
                        'objective' => $aiSoap['objective'] ?? '',
                        'assessment' => $aiSoap['assessment'] ?? '',
                        'plan' => $aiSoap['plan'] ?? '',
                        'is_ai_generated' => true,
                        'doctor_signed' => false,
                    ]);
                    
                    $encounter->update(['soap_note_id' => $soapNote->id]);
                }
            } catch (\Exception $e) {
                Log::error('[SoapNoteService] On-the-fly SOAP generation failed: ' . $e->getMessage(), [
                    'encounter_id' => $encounterId,
                    'exception' => $e
                ]);
            }
        }
        return $soapNote;
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
