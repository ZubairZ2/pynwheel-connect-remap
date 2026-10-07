"""One error shape for every endpoint: {"success": false, "error": {"code", "message", "details"?}}.

Nothing internal (SQL, stack traces, table names, upstream bodies) reaches
a client: unexpected exceptions are logged with a reference and answered
as `internal_error`.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("tour_api.errors")


class ApiError(Exception):
    """A deliberate, client-facing error."""

    def __init__(self, status: int, code: str, message: str, details: Any = None, headers: dict[str, str] | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers or {}

    def body(self) -> dict[str, Any]:
        error: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details is not None:
            error["details"] = self.details
        return {"success": False, "error": error}


# Shorthands for the codes the API documents.
def unauthorized(code: str = "unauthorized", message: str = "Sign in to continue.") -> ApiError:
    return ApiError(401, code, message, headers={"WWW-Authenticate": "Bearer"})


def forbidden(code: str = "forbidden", message: str = "You are not allowed to do that.") -> ApiError:
    return ApiError(403, code, message)


def not_found(message: str = "No such property.", code: str = "not_found") -> ApiError:
    return ApiError(404, code, message)


def unprocessable(code: str, message: str, details: Any = None) -> ApiError:
    return ApiError(422, code, message, details)


def upstream_unavailable(message: str = "The Pynwheel server could not be reached. Please try again.") -> ApiError:
    return ApiError(503, "upstream_unavailable", message)


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(exc.body(), status_code=exc.status, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [{"loc": [str(p) for p in e.get("loc", [])], "message": e.get("msg", "")} for e in exc.errors()]
        return JSONResponse({"success": False, "error": {"code": "validation_error", "message": "The request is not valid.", "details": details}}, status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse({"success": False, "error": {"code": code, "message": message}}, status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        ref = uuid.uuid4().hex[:12]
        log.exception("internal_error ref=%s %s %s", ref, request.method, request.url.path)
        return JSONResponse({"success": False, "error": {"code": "internal_error", "message": "Something went wrong on our side.", "details": {"ref": ref}}}, status_code=500)
