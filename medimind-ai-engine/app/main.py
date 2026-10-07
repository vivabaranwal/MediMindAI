import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.container import Services, build_services
from app.api.routes import probes, router
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging, get_logger, request_id_var

log = get_logger("http")


def _envelope(status: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    body: dict = {"error": {"code": code, "message": message, "request_id": request_id_var.get()}}
    if details:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


def create_app(services: Services | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if services is not None:
            app.state.services = services
        else:
            settings = get_settings()  # raises at startup if required config is missing/weak
            configure_logging(settings.LOG_LEVEL)
            app.state.services = build_services(settings)
        yield

    app = FastAPI(title="MediMind AI Engine", version="2.0.0", lifespan=lifespan)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_var.set(rid[:64])
        started = time.monotonic()
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = rid[:64]
        log.info("http_request", extra={
            "method": request.method, "path": request.url.path, "status": response.status_code,
            "ms": int((time.monotonic() - started) * 1000), "request_id": rid[:64],
        })
        return response

    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError):
        if exc.status_code >= 500:
            log.error("app_error", extra={"code": exc.code})
        return _envelope(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        # Report where it failed, never echo the submitted values (they may be clinical text).
        details = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "issue": e["type"]} for e in exc.errors()]
        return _envelope(422, "validation_error", "The request is invalid.", details)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.error("unhandled_exception", extra={"error_type": type(exc).__name__})
        return _envelope(500, "internal_error", "An internal error occurred.")

    app.include_router(probes)
    app.include_router(router)
    return app


app = create_app()
