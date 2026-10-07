<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The AI engine could not do what was asked. Always surfaces as a real HTTP error
 * with a stable `code`; callers must never persist or display a fabricated fallback.
 */
class AiServiceException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode = 'ai_unavailable',
        public readonly int $httpStatus = 503,
        public readonly ?string $requestId = null,
    ) {
        parent::__construct($message);
    }

    /** Transient failures worth retrying (network, provider, index); validation/file errors are not. */
    public function isRetryable(): bool
    {
        return in_array($this->errorCode, [
            'ai_unreachable', 'llm_error', 'llm_output_invalid', 'retrieval_error', 'ocr_unavailable', 'internal_error',
        ], true);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
            'request_id' => $this->requestId,
        ], $this->httpStatus);
    }
}
