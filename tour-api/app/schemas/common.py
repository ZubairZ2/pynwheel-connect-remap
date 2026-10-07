"""Shared response pieces."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str = Field(description="Stable machine code, e.g. invalid_credentials, not_found, tour_disabled, no_path.")
    message: str = Field(description="Human-readable explanation, safe to show in the app.")
    details: Any | None = Field(default=None, description="Optional structured details (validation errors, invalid ids).")


class ErrorResponse(BaseModel):
    success: bool = Field(default=False)
    error: ErrorBody


ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorResponse, "description": "Missing, invalid, expired or revoked token; or wrong credentials."},
    403: {"model": ErrorResponse, "description": "Signed in but not a Pynwheel Super Admin, or no access to the property."},
    404: {"model": ErrorResponse, "description": "No such property / stop / level."},
    422: {"model": ErrorResponse, "description": "Validation error, Self-Guided Tour disabled, invalid stop, or no route."},
    503: {"model": ErrorResponse, "description": "The Rails CMS could not be reached (sign in / sign out only)."},
}
