"""Typed error taxonomy. Every failure surfaces as an HTTP error with a stable
`code`; the service never answers 200 with error text inside the payload."""


class AppError(Exception):
    status_code = 500
    code = "internal_error"
    public_message = "An internal error occurred."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.public_message)
        self.message = message or self.public_message


class RequestValidationFailed(AppError):
    status_code = 422
    code = "validation_error"
    public_message = "The request is invalid."


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"
    public_message = "Invalid or missing service credentials."


class FileRejected(AppError):
    status_code = 400
    code = "file_rejected"
    public_message = "The uploaded file was rejected."


class FileTooLarge(FileRejected):
    status_code = 413
    code = "file_too_large"
    public_message = "The uploaded file is too large."


class UnsupportedFileType(FileRejected):
    status_code = 415
    code = "unsupported_file_type"
    public_message = "Unsupported file type."


class OcrError(AppError):
    status_code = 422
    code = "ocr_failed"
    public_message = "Text could not be extracted from the document."


class OcrUnavailable(AppError):
    status_code = 503
    code = "ocr_unavailable"
    public_message = "The OCR engine is not available."


class LLMError(AppError):
    status_code = 502
    code = "llm_error"
    public_message = "The language model request failed."


class LLMOutputInvalid(AppError):
    status_code = 502
    code = "llm_output_invalid"
    public_message = "The language model returned an unusable response."


class RetrievalError(AppError):
    status_code = 503
    code = "retrieval_error"
    public_message = "The retrieval index is unavailable."
