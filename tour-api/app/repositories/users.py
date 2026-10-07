"""Users and their Doorkeeper access tokens, read-only.

The Tour App signs in through the CMS's own Doorkeeper password grant (see
`integrations/rails.py`); the token it gets back is a row of
`oauth_access_tokens`. Each request's bearer token is looked up here, so
revocation (`revoked_at`) and expiry (`created_at + expires_in`) are the
CMS's, never a copy.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from .db import Database

SUPER_ADMIN_ROLE = "Super admin"


@dataclass(frozen=True)
class UserRow:
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    role: str | None
    company_id: int | None
    company_inactive: bool
    invitation_pending: bool

    @property
    def name(self) -> str:
        """`User#name`: the email when both names are missing, else "First Last"."""
        if self.first_name is None and self.last_name is None:
            return self.email
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    @property
    def is_super_admin(self) -> bool:
        return self.role == SUPER_ADMIN_ROLE


@dataclass(frozen=True)
class TokenRow:
    token_id: int
    user: UserRow | None
    revoked_at: datetime | None
    created_at: datetime
    expires_in: int | None

    @property
    def revoked(self) -> bool:
        return self.revoked_at is not None

    def expired(self, now: datetime | None = None) -> bool:
        if self.expires_in is None:
            return False
        now = now or datetime.now(timezone.utc)
        return self.created_at + timedelta(seconds=self.expires_in) <= now

    @property
    def expires_at(self) -> datetime | None:
        return self.created_at + timedelta(seconds=self.expires_in) if self.expires_in is not None else None


USER_COLUMNS = """
    u.id, u.email, u.first_name, u.last_name, u.role, u.company_id,
    coalesce(c.inactivate, false) as company_inactive,
    (u.invitation_token is not null and u.invitation_accepted_at is null) as invitation_pending
"""


def _user(row: dict[str, Any] | None) -> UserRow | None:
    if row is None or row.get("id") is None:
        return None
    return UserRow(
        id=row["id"],
        email=row["email"],
        first_name=row.get("first_name"),
        last_name=row.get("last_name"),
        role=row.get("role"),
        company_id=row.get("company_id"),
        company_inactive=bool(row.get("company_inactive")),
        invitation_pending=bool(row.get("invitation_pending")),
    )


class UsersRepository:
    def __init__(self, db: Database):
        self.db = db

    def find_token(self, token: str) -> TokenRow | None:
        row = self.db.fetch_one(
            f"""
            select t.id as token_id, t.revoked_at, t.created_at, t.expires_in, {USER_COLUMNS}
            from oauth_access_tokens t
            left join users u on u.id = t.resource_owner_id
            left join companies c on c.id = u.company_id
            where t.token = %s
            """,
            (token,),
        )
        if row is None:
            return None
        created = row["created_at"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return TokenRow(token_id=row["token_id"], user=_user(row), revoked_at=row["revoked_at"], created_at=created, expires_in=row["expires_in"])

    def find_user(self, user_id: int) -> UserRow | None:
        return _user(self.db.fetch_one(f"select {USER_COLUMNS} from users u left join companies c on c.id = u.company_id where u.id = %s", (user_id,)))
