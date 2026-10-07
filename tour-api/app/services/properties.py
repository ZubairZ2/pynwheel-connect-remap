"""Properties the signed-in user may tour."""
from __future__ import annotations

import threading
import time

from ..errors import not_found, unprocessable
from ..repositories.properties import PropertiesRepository, PropertyRow
from ..repositories.users import UserRow
from ..services.auth import AuthContext


def can_access_property(user: UserRow, property_row: PropertyRow) -> bool:
    """`User#can_access_community?` for the roles this API admits: a Super
    Admin sees every property. Kept as a function so that admitting other
    roles later means extending the rule here, never in a router."""
    return user.is_super_admin


class PropertyService:
    def __init__(self, properties: PropertiesRepository, list_cache_ttl: int = 60):
        self.properties = properties
        self._ttl = list_cache_ttl
        self._cache: tuple[float, list[PropertyRow]] | None = None
        self._lock = threading.Lock()

    def list(self, context: AuthContext, *, query: str | None = None, tour_only: bool = False) -> list[PropertyRow]:
        rows = self._all()
        rows = [r for r in rows if can_access_property(context.user, r)]
        if tour_only:
            rows = [r for r in rows if r.tour_enabled]
        if query:
            q = query.strip().lower()
            rows = [r for r in rows if q in (r.name or "").lower() or q in (r.city or "").lower() or q in (r.address or "").lower()]
        return rows

    def get(self, context: AuthContext, property_id: int) -> PropertyRow:
        row = self.properties.find(property_id)
        # A property the user may not see is indistinguishable from one that does not exist.
        if row is None or not can_access_property(context.user, row):
            raise not_found()
        return row

    @staticmethod
    def require_tour(row: PropertyRow) -> PropertyRow:
        if not row.tour_enabled:
            raise unprocessable("tour_disabled", "This property has no Self-Guided Tour.")
        return row

    def _all(self) -> list[PropertyRow]:
        now = time.monotonic()
        with self._lock:
            if self._cache and now - self._cache[0] < self._ttl:
                return self._cache[1]
        rows = self.properties.list_all()
        with self._lock:
            self._cache = (now, rows)
        return rows

    def invalidate(self) -> None:
        with self._lock:
            self._cache = None
