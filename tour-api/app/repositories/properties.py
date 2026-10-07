"""Properties (the CMS's `communities`), read-only."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .db import Database
from .rubyisms import present, tour_enabled


@dataclass(frozen=True)
class PropertyRow:
    id: int
    name: str
    address: str | None
    city: str | None
    state: str | None
    zip: str | None
    logo_url: str | None
    company_id: int | None
    company_name: str | None
    is_sitemap: bool
    auto_wayfinding: bool
    tour_enabled: bool
    locked: bool


COLUMNS = """
    c.id, c.name, c.address, c.city, c.state, c.zip, c.logo, c.company_id, co.name as company_name,
    c.is_sitemap, c.auto_wayfinding, c.self_tour, c.product_options, c.locked
"""


def _row(r: dict[str, Any]) -> PropertyRow:
    return PropertyRow(
        id=r["id"],
        name=r["name"] or f"Property {r['id']}",
        address=r.get("address"),
        city=r.get("city"),
        state=r.get("state"),
        zip=r.get("zip"),
        logo_url=None,  # the logo is a CarrierWave upload without a standard URL copy; resolved by the service when needed
        company_id=r.get("company_id"),
        company_name=r.get("company_name"),
        is_sitemap=present(r.get("is_sitemap")),
        auto_wayfinding=present(r.get("auto_wayfinding")),
        tour_enabled=tour_enabled(r.get("self_tour"), r.get("product_options")),
        locked=present(r.get("locked")),
    )


class PropertiesRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_all(self) -> list[PropertyRow]:
        rows = self.db.fetch_all(f"select {COLUMNS} from communities c left join companies co on co.id = c.company_id order by lower(c.name), c.id")
        return [_row(r) for r in rows]

    def find(self, property_id: int) -> PropertyRow | None:
        r = self.db.fetch_one(f"select {COLUMNS} from communities c left join companies co on co.id = c.company_id where c.id = %s", (property_id,))
        return _row(r) if r else None

    def counts(self, property_id: int) -> dict[str, int]:
        r = self.db.fetch_one(
            """
            select
              (select count(*) from floorplates f where f.community_id = %(id)s) as floorplates,
              (select count(*) from units u where u.community_id = %(id)s and u.visible = true) as units,
              (select count(*) from amenities a where a.community_id = %(id)s and a.amenityable_type in ('Floorplate','Sitemap')) as amenities
            """,
            {"id": property_id},
        )
        return {k: int(v or 0) for k, v in (r or {}).items()}
