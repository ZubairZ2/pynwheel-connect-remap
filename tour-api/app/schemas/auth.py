from __future__ import annotations

from datetime import datetime

import re

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, description="The Pynwheel CMS account email.")
    password: str = Field(min_length=1, max_length=256, description="The account password; verified by the CMS (Devise), never stored here.")

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: str) -> str:
        # Devise's own rule (config.email_regexp): something@something, no whitespace.
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+", value):
            raise ValueError("must be an email address")
        return value


class UserOut(BaseModel):
    id: int
    name: str = Field(description="`User#name`: first and last name, or the email.")
    email: str
    role: str = Field(description="Always `super_admin`: no other role may use the Tour App API.")


class LoginResponse(BaseModel):
    success: bool = True
    access_token: str = Field(description="The CMS's Doorkeeper access token; send as `Authorization: Bearer <token>`.")
    token_type: str = "bearer"
    expires_at: datetime | None = Field(description="When the token stops working (Doorkeeper `access_token_expires_in`, 5 days).")
    user: UserOut


class MeResponse(BaseModel):
    success: bool = True
    user: UserOut
    expires_at: datetime | None


class LogoutResponse(BaseModel):
    success: bool = True
    revoked: bool = Field(description="Whether the CMS confirmed the revocation; the app drops the token either way.")
