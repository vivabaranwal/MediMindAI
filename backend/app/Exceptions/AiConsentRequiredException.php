<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class AiConsentRequiredException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This patient has not consented to AI-assisted processing of their data.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => 'ai_consent_required',
        ], 403);
    }
}
