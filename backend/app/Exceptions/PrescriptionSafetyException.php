<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** A prescription cannot be approved until critical allergy alerts are explicitly acknowledged. */
class PrescriptionSafetyException extends RuntimeException
{
    public function __construct(public readonly array $alerts)
    {
        parent::__construct('This prescription conflicts with documented allergies. Review the alerts and confirm to override.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => 'critical_allergy_alert',
            'alerts' => $this->alerts,
        ], 422);
    }
}
