<?php

namespace App\Services;

use App\Exceptions\AiServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * The only class that talks to the AI engine. It knows transport, auth and error
 * mapping; it knows nothing about encounters or patients (see EncounterContextBuilder).
 *
 * Failures always throw AiServiceException. There are no fallback payloads.
 */
class AIGatewayService
{
    public function brief(array $payload): array
    {
        return $this->post('briefs', $payload);
    }

    public function soap(array $payload): array
    {
        return $this->post('soap', $payload);
    }

    public function intakeQuestions(array $payload): array
    {
        return $this->post('intake/questions', $payload);
    }

    public function intakeSummary(array $payload): array
    {
        return $this->post('intake/summary', $payload);
    }

    public function suggestions(array $payload): array
    {
        return $this->post('suggestions', $payload);
    }

    public function checkPrescription(array $payload): array
    {
        return $this->post('prescriptions/check', $payload);
    }

    public function chat(array $payload): array
    {
        return $this->post('chat', $payload);
    }

    /**
     * Send a stored report to the engine for extraction/OCR, structuring and indexing.
     */
    public function ingestReport(string $contents, string $filename, int $reportId, int $patientId, ?int $encounterId): array
    {
        $fields = ['report_id' => $reportId, 'patient_id' => $patientId];
        if ($encounterId !== null) {
            $fields['encounter_id'] = $encounterId;
        }

        return $this->send(
            fn (PendingRequest $http) => $http
                ->timeout((int) config('ai.timeouts.ingest'))
                ->attach('file', $contents, $filename)
                ->post('reports/ingest', $fields),
            'reports/ingest',
        );
    }

    /** Remove a report's chunks from the search index. */
    public function deleteReport(int $reportId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->timeout((int) config('ai.timeouts.default'))->delete("reports/{$reportId}"),
            'reports/delete',
        );
    }

    private function post(string $path, array $payload): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http
                ->timeout((int) config('ai.timeouts.default'))
                ->post($path, $payload),
            $path,
        );
    }

    private function client(string $requestId): PendingRequest
    {
        $secret = (string) config('services.fastapi.secret');
        $url = (string) config('services.fastapi.url');

        if ($secret === '' || $url === '') {
            throw new AiServiceException('The AI service is not configured.', 'ai_not_configured', 503, $requestId);
        }

        return Http::baseUrl(rtrim($url, '/') . '/internal/v1')
            ->acceptJson()
            ->withHeaders(['X-Internal-Secret' => $secret, 'X-Request-ID' => $requestId])
            // Retry only when the engine could not be reached at all; never replay a request it may have processed.
            ->retry(2, 250, fn ($e) => $e instanceof ConnectionException, throw: false);
    }

    private function send(callable $call, string $path): array
    {
        $requestId = (string) Str::uuid();
        $started = microtime(true);

        try {
            /** @var Response $response */
            $response = $call($this->client($requestId));
        } catch (ConnectionException $e) {
            Log::error('[ai] engine unreachable', ['path' => $path, 'request_id' => $requestId]);
            throw new AiServiceException('The AI service is unreachable. Please try again shortly.', 'ai_unreachable', 503, $requestId);
        }

        Log::info('[ai] call', [
            'path' => $path,
            'status' => $response->status(),
            'ms' => (int) ((microtime(true) - $started) * 1000),
            'request_id' => $requestId,
        ]);

        if ($response->failed()) {
            throw $this->toException($response, $requestId);
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new AiServiceException('The AI service returned an unreadable response.', 'llm_output_invalid', 502, $requestId);
        }

        return $json;
    }

    private function toException(Response $response, string $requestId): AiServiceException
    {
        $error = $response->json('error') ?? [];
        $code = (string) ($error['code'] ?? 'internal_error');
        $message = (string) ($error['message'] ?? 'The AI service failed.');

        // Engine-side client errors are mapped to 4xx for the browser; its own faults are 502/503.
        $status = match (true) {
            in_array($code, ['file_rejected', 'file_too_large', 'unsupported_file_type', 'ocr_failed', 'validation_error'], true) => 422,
            $code === 'unauthorized' => 503, // our misconfiguration, not the user's problem
            $response->status() >= 500 => in_array($code, ['retrieval_error', 'ocr_unavailable'], true) ? 503 : 502,
            default => 502,
        };

        if ($code === 'unauthorized') {
            Log::critical('[ai] engine rejected our credentials', ['request_id' => $requestId]);
            $message = 'The AI service is not available.';
            $code = 'ai_not_configured';
        }

        return new AiServiceException($message, $code, $status, $requestId);
    }
}
