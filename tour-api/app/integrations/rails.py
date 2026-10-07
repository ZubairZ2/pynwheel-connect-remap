"""The two calls the API makes to the Rails CMS: sign in and sign out.

Sign-in is the CMS's own Doorkeeper password grant
(`POST /api/v2/auth/token`, `grant_type=password`; the routes mount Doorkeeper under the `api/v2/auth` scope), whose
`resource_owner_from_credentials` block runs Devise's
`find_for_database_authentication` + `valid_for_authentication?` +
`valid_password?`. The API never sees a password hash and never
re-implements the password rules. Sign-out revokes the token at
`POST /api/v2/auth/revoke`.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from ..errors import ApiError, upstream_unavailable

log = logging.getLogger("tour_api.rails")

# `use_doorkeeper scope: 'api/v2/auth'` in config/routes.rb: Doorkeeper's /oauth/* routes live under this scope.
TOKEN_PATH = "/api/v2/auth/token"
REVOKE_PATH = "/api/v2/auth/revoke"


@dataclass(frozen=True)
class GrantedToken:
    access_token: str
    token_type: str
    expires_in: int | None
    created_at: int | None


class RailsAuthClient:
    def __init__(self, base_url: str, timeout_s: float = 15.0, transport: httpx.BaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout_s, transport=transport, headers={"Accept": "application/json"})

    def close(self) -> None:
        self._client.close()

    def password_grant(self, email: str, password: str) -> GrantedToken:
        try:
            response = self._client.post(TOKEN_PATH, data={"grant_type": "password", "email": email, "password": password})
        except httpx.HTTPError as exc:
            log.warning("doorkeeper token endpoint unreachable: %s", exc.__class__.__name__)
            raise upstream_unavailable()
        body: dict[str, Any] = {}
        try:
            body = response.json() if response.content else {}
        except ValueError:
            body = {}
        if response.status_code in (400, 401) or body.get("error") in ("invalid_grant", "invalid_request", "invalid_client", "unauthorized_client"):
            raise ApiError(401, "invalid_credentials", "That email and password do not match.")
        token = body.get("access_token")
        if response.status_code == 200 and not token and body.get("success") is False:
            # The CMS's CustomTokenResponse: the password was right but the account is not a
            # portal user (`User#verified_portal_user?`), so the CMS withholds the token.
            log.warning("doorkeeper token endpoint refused the account (not a portal user)")
            raise ApiError(403, "not_authorized_account", "This account is not allowed to use the Tour App.")
        if response.status_code != 200 or not token:
            log.warning("doorkeeper token endpoint answered %s without a token", response.status_code)
            raise ApiError(401, "invalid_credentials", "That email and password do not match.")
        return GrantedToken(access_token=str(token), token_type=str(body.get("token_type") or "Bearer"), expires_in=body.get("expires_in"), created_at=body.get("created_at"))

    def revoke(self, token: str) -> bool:
        """Best effort: true when the CMS confirmed the revocation."""
        try:
            response = self._client.post(REVOKE_PATH, data={"token": token})
            return response.status_code == 200
        except httpx.HTTPError as exc:
            log.warning("doorkeeper revoke endpoint unreachable: %s", exc.__class__.__name__)
            return False
