"""Sign in / sign out / who am I, over the CMS's own accounts and tokens."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from ..errors import ApiError, forbidden, unauthorized
from ..integrations.rails import RailsAuthClient
from ..repositories.users import TokenRow, UserRow, UsersRepository

log = logging.getLogger("tour_api.auth")


@dataclass(frozen=True)
class AuthContext:
    token: str
    token_row: TokenRow
    user: UserRow

    @property
    def role(self) -> str:
        return "super_admin"


class AuthService:
    def __init__(self, users: UsersRepository, rails: RailsAuthClient):
        self.users = users
        self.rails = rails

    def login(self, email: str, password: str) -> AuthContext:
        granted = self.rails.password_grant(email, password)
        row = self.users.find_token(granted.access_token)
        if row is None or row.user is None:
            # The CMS minted a token the database does not show: refuse rather than guess.
            log.error("login: token granted by the CMS was not found in oauth_access_tokens")
            raise ApiError(503, "upstream_unavailable", "Sign-in could not be completed. Please try again.")
        try:
            return self._admit(granted.access_token, row)
        except ApiError:
            # Not a Super Admin (or inactive): do not hand the token to the app, and let the CMS revoke it.
            self.rails.revoke(granted.access_token)
            log.warning("login refused for user_id=%s role=%r", row.user.id, row.user.role)
            raise

    def authenticate(self, bearer: str | None) -> AuthContext:
        if not bearer:
            raise unauthorized("unauthorized", "Sign in to continue.")
        row = self.users.find_token(bearer)
        if row is None:
            raise unauthorized("invalid_token", "That session is not valid. Please sign in again.")
        return self._admit(bearer, row)

    def logout(self, context: AuthContext) -> bool:
        return self.rails.revoke(context.token)

    def _admit(self, token: str, row: TokenRow) -> AuthContext:
        if row.revoked:
            raise unauthorized("token_revoked", "You have been signed out. Please sign in again.")
        if row.expired():
            raise unauthorized("token_expired", "Your session has expired. Please sign in again.")
        user = row.user
        if user is None:
            raise unauthorized("invalid_token", "That session is not valid. Please sign in again.")
        if user.invitation_pending or user.company_inactive:
            raise forbidden("inactive_user", "This account is not active.")
        if not user.is_super_admin:
            raise forbidden("not_super_admin", "Only Pynwheel Super Admins can use the Tour App.")
        return AuthContext(token=token, token_row=row, user=user)
