<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSoapNoteRequest;
use App\Http\Requests\SignSoapNoteRequest;
use App\Services\SoapNoteService;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SoapNoteController extends Controller
{
    protected SoapNoteService $soapNoteService;

    public function __construct(SoapNoteService $soapNoteService)
    {
        $this->soapNoteService = $soapNoteService;
    }

    /**
     * Retrieve SOAP note draft/signed.
     */
    public function show(int $encounterId): JsonResponse
    {
        $soapNote = $this->soapNoteService->getSoapNoteForEncounter($encounterId);

        if (!$soapNote) {
            return response()->json([
                'success' => false,
                'code' => 'soap_not_generated',
                'message' => 'SOAP note not found for this encounter.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $soapNote,
        ]);
    }

    /**
     * Generate (or regenerate an unsigned) SOAP draft with AI.
     */
    public function generate(int $encounterId): JsonResponse
    {
        $soapNote = $this->soapNoteService->generateDraft($encounterId);

        return response()->json([
            'success' => true,
            'data' => $soapNote,
            'event' => 'SOAP_GENERATED',
            'encounter_id' => $encounterId,
        ]);
    }

    /**
     * Update SOAP note draft.
     */
    public function update(UpdateSoapNoteRequest $request, int $encounterId): JsonResponse
    {
        $doctor = Doctor::where('user_id', Auth::id())->first();
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        try {
            $soapNote = $this->soapNoteService->saveDraft($encounterId, $request->validated(), $doctor->id);

            return response()->json([
                'success' => true,
                'message' => 'SOAP note draft saved successfully.',
                'data' => $soapNote,
                'event' => 'SOAP_GENERATED',
                'encounter_id' => $encounterId
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Doctor signs SOAP note.
     */
    public function sign(SignSoapNoteRequest $request, int $encounterId): JsonResponse
    {
        $doctor = Doctor::where('user_id', Auth::id())->first();
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found for this user.',
            ], 404);
        }

        $soapNote = $this->soapNoteService->getSoapNoteForEncounter($encounterId);
        if (!$soapNote) {
            return response()->json([
                'success' => false,
                'message' => 'SOAP note not found for this encounter.',
            ], 404);
        }

        try {
            $signedSoapNote = $this->soapNoteService->signSoapNote($soapNote->id, $doctor->id);

            return response()->json([
                'success' => true,
                'message' => 'SOAP note signed successfully.',
                'data' => $signedSoapNote,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
