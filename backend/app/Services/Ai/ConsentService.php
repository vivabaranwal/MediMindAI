<?php

namespace App\Services\Ai;

use App\Exceptions\AiConsentRequiredException;
use App\Models\Patient;
use App\Models\PatientConsent;

class ConsentService
{
    public const AI = 'ai_assistance';

    /** The most recent decision wins, and an expired grant no longer counts. */
    public function hasConsent(Patient $patient, string $type): bool
    {
        $latest = $patient->consents()
            ->where('consent_type', $type)
            ->orderByDesc('consented_at')
            ->orderByDesc('id')
            ->first();

        return $latest
            && $latest->consented
            && ($latest->expires_at === null || $latest->expires_at->isFuture());
    }

    public function hasAiConsent(Patient $patient): bool
    {
        return ! config('ai.require_consent') || $this->hasConsent($patient, self::AI);
    }

    public function assertAiConsent(Patient $patient): void
    {
        if (! $this->hasAiConsent($patient)) {
            throw new AiConsentRequiredException();
        }
    }

    public function record(Patient $patient, string $type, bool $granted, ?string $ip = null): PatientConsent
    {
        return $patient->consents()->create([
            'consent_type' => $type,
            'consented' => $granted,
            'ip_address' => $ip,
            'consented_at' => now(),
        ]);
    }
}
