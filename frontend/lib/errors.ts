import axios from "axios";

/** An error from the API with the stable machine-readable `code` the backend sends. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACKS: Record<string, string> = {
  ai_consent_required:
    "This patient has not consented to AI-assisted processing. Record their consent on the patient profile to use AI features.",
  ai_unreachable: "The AI service is unreachable right now. Please try again in a moment.",
  ai_not_configured: "The AI service is not available. Contact an administrator.",
  llm_error: "The AI model could not complete the request. Please try again.",
  llm_output_invalid: "The AI returned an unusable answer. Please try again.",
};

/** Normalise any thrown value into an ApiError with a message safe to show to a clinician. */
export function toApiError(err: unknown, fallback = "Something went wrong."): ApiError {
  if (err instanceof ApiError) return err;

  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { message?: string; code?: string; errors?: Record<string, string[]> } | undefined;
    const code = body?.code;
    const validation = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    const message =
      (code && FALLBACKS[code]) || validation || body?.message || (err.response ? fallback : "Cannot reach the server. Check your connection.");
    return new ApiError(message, code, err.response?.status);
  }

  return new ApiError(err instanceof Error ? err.message : fallback);
}
