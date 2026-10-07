from __future__ import annotations

import logging

from fastapi import APIRouter

from ...schemas.auth import LoginRequest, LoginResponse, LogoutResponse, MeResponse, UserOut
from ...schemas.common import ERROR_RESPONSES
from ..deps import ContainerDep, CurrentUser

log = logging.getLogger("tour_api.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(context) -> UserOut:
    return UserOut(id=context.user.id, name=context.user.name, email=context.user.email, role=context.role)


@router.post("/login", response_model=LoginResponse, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403, 422, 503)}, summary="Sign in with Pynwheel CMS credentials")
def login(body: LoginRequest, container: ContainerDep) -> LoginResponse:
    """Verifies the email and password through the CMS's own Doorkeeper password
    grant (Devise checks the password), then admits the account only when it
    is a Pynwheel **Super Admin**. The returned token is the CMS's access token."""
    context = container.auth.login(str(body.email), body.password)
    log.info("login ok user_id=%s", context.user.id)
    return LoginResponse(access_token=context.token, token_type="bearer", expires_at=context.token_row.expires_at, user=_user_out(context))


@router.post("/logout", response_model=LogoutResponse, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403)}, summary="Revoke the current token")
def logout(container: ContainerDep, user: CurrentUser) -> LogoutResponse:
    revoked = container.auth.logout(user)
    log.info("logout user_id=%s revoked=%s", user.user.id, revoked)
    return LogoutResponse(revoked=revoked)


@router.get("/me", response_model=MeResponse, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403)}, summary="The signed-in user")
def me(user: CurrentUser) -> MeResponse:
    return MeResponse(user=_user_out(user), expires_at=user.token_row.expires_at)
