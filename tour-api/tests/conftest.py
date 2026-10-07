"""Unit-test fixtures: a synthetic property (two buildings, a stacked plate, an
elevator, stairs, a tour) built through the real GraphBuilder, and fakes for
the database-backed repositories and the Rails client. No database, no
network."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.container import Container
from app.errors import ApiError
from app.integrations.assets import AssetError, SvgAsset
from app.integrations.rails import GrantedToken
from app.main import create_app
from app.repositories.properties import PropertyRow
from app.repositories.users import TokenRow, UserRow
from app.services.auth import AuthService
from app.services.maps import MapService
from app.services.properties import PropertyService
from app.services.routing import RoutingService
from app.services.stops import StopsService
from app.wayfinding.engine import BuiltGraph, WayfindingEngine
from app.wayfinding.graph_builder import GraphBuilder
from app.wayfinding.rows import WayfindingRows

NOW = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)

# ----------------------------------------------------------------- the property
TOUR_PROPERTY = 100
NO_TOUR_PROPERTY = 200
OTHER_PROPERTY = 300  # exists, tour on, but has its own stops (for cross-property checks)


def ts(**kw: Any) -> dict[str, Any]:
    return kw


def property_rows(community_id: int = TOUR_PROPERTY) -> WayfindingRows:
    community = {"id": community_id, "name": "Tour Property", "is_sitemap": False, "auto_wayfinding": True, "self_tour": True, "product_options": None}
    rows = WayfindingRows(community=community)
    rows.floorplates = [
        {"id": 1, "name": "Floors 1-3", "number": 1, "building": "A", "range": "1-3", "image": "a.png", "standard_image_url": "https://bucket.s3.amazonaws.com/uploads/floorplate/image/1/a.png", "svg_image": None, "width": 760, "height": 470, "scale_ft_per_px": None, "wayfinding_version": 3},
        {"id": 2, "name": "Floor 5", "number": 5, "building": "A", "range": "5", "image": "b.png", "standard_image_url": "https://bucket.s3.amazonaws.com/uploads/floorplate/image/2/b.png", "svg_image": "b.svg", "width": 760, "height": 470, "scale_ft_per_px": None, "wayfinding_version": 1},
        {"id": 3, "name": "Tower B", "number": 1, "building": "B", "range": "1", "image": "c.png", "standard_image_url": None, "svg_image": "bad.svg", "width": 0, "height": 0, "scale_ft_per_px": None, "wayfinding_version": 0, "svg_metadata": {"width": 2000, "height": 2000}},
    ]
    H = lambda i, x, y, parent, nxt: {"id": i, "x_plot": x, "y_plot": y, "parent_type": "Floorplate", "parent_id": parent, "next_points": nxt, "review_status": "confirmed"}
    rows.hallways = [H(1, 100, 100, 1, [2]), H(2, 300, 100, 1, [3]), H(3, 300, 300, 1, [4]), H(4, 500, 300, 1, []), H(5, 100, 100, 2, [6]), H(6, 300, 100, 2, []), H(7, 100, 100, 3, [8]), H(8, 300, 100, 3, []), H(9, 700, 50, 1, [])]  # h9: an island node
    rows.units = [
        {"id": 101, "marketing_name": "101", "floor": 1, "building": "A", "floorplate_id": 1, "x_plot": 320, "y_plot": 60, "lock_provider": "", "stop_description": "Turn left at the lobby"},
        {"id": 301, "marketing_name": "301", "floor": 3, "building": "A", "floorplate_id": 1, "x_plot": 520, "y_plot": 260, "lock_provider": "", "stop_description": None},
        {"id": 102, "marketing_name": "102", "floor": 1, "building": "A", "floorplate_id": 1, "x_plot": 340, "y_plot": 70, "lock_provider": "", "stop_description": None},
        {"id": 201, "marketing_name": "201", "floor": 1, "building": "B", "floorplate_id": 3, "x_plot": 320, "y_plot": 60, "lock_provider": "", "stop_description": None},
        {"id": 999, "marketing_name": "Island", "floor": 1, "building": "A", "floorplate_id": 1, "x_plot": 700, "y_plot": 40, "lock_provider": "", "stop_description": None},
    ]
    rows.amenities = [
        {"id": 11, "name": "Gym", "floor": 1, "building": "A", "amenityable_type": "Floorplate", "amenityable_id": 1, "x_plot": 120, "y_plot": 140, "lock_provider": "", "directional_text": 'Past the mailroom.<font color="red"><br></font>'},
        {"id": 12, "name": "Pool", "floor": 1, "building": "A", "amenityable_type": "Floorplate", "amenityable_id": 1, "x_plot": 140, "y_plot": 160, "lock_provider": "", "directional_text": None},
    ]
    rows.doors = []
    rows.elevators = [
        {"id": 50, "name": "Elevator 1", "x_plot": 290, "y_plot": 90, "directional_text": None, "floorplate_id": 1, "sitemap_id": None, "floorplate_covering_range": "1-5", "building": "A", "lock_provider": "", "kind": "elevator", "accessible": True, "floor_positions": {}},
        {"id": 51, "name": "North stairs", "x_plot": 480, "y_plot": 280, "directional_text": None, "floorplate_id": 1, "sitemap_id": None, "floorplate_covering_range": "1-3", "building": "A", "lock_provider": "", "kind": "stairs", "accessible": False, "floor_positions": {}},
    ]
    rows.bsps = [{"id": 70, "name": "Tower B entrance", "building": "B", "floor": 1, "x_plot": 90, "y_plot": 92, "lock_provider": "", "directional_text": "Use the side gate"}]
    rows.main_tour = {"id": 7, "name": "Main Tour", "x_plot": 90, "y_plot": 92, "starting_floor": 1, "building": "A", "building_order": ["A", "B"], "tour_setup_version": 2}
    rows.tour_stops = [
        ts(id=1, stop_type="unit", stop_id=101, name="101", sort=2, display_stop=True, duration_minutes=4),
        ts(id=2, stop_type="unit", stop_id=301, name="301", sort=3, display_stop=True, duration_minutes=None),
        ts(id=3, stop_type="amenity", stop_id=11, name="Gym", sort=1, display_stop=True, duration_minutes=3),
        ts(id=4, stop_type="elevator", stop_id=50, name="Elevator 1", sort=4, display_stop=True, duration_minutes=None),
        ts(id=5, stop_type="unit", stop_id=102, name="102", sort=5, display_stop=False, duration_minutes=None),
        ts(id=6, stop_type="amenity", stop_id=12, name="Pool", sort=6, display_stop=True, duration_minutes=None),
        ts(id=8, stop_type="unit", stop_id=201, name="201", sort=7, display_stop=True, duration_minutes=2),
        ts(id=9, stop_type="unit", stop_id=101, name="101 duplicate", sort=8, display_stop=True, duration_minutes=None),
        ts(id=10, stop_type="unit", stop_id=999, name="Island", sort=9, display_stop=True, duration_minutes=None),
    ]
    rows.unit_buildings = ["A", "A", "A", "B", "A"]
    rows.amenity_buildings = ["A", "A"]
    rows.bucket_hint = "https://bucket.s3.amazonaws.com/uploads/floorplate/image/1/a.png"
    return rows


# ------------------------------------------------------------------- fakes
class FakeEngine(WayfindingEngine):
    def __init__(self, settings: Settings):
        super().__init__(db=None, settings=settings)  # type: ignore[arg-type]
        self.versions = {TOUR_PROPERTY: "wf-100-test", OTHER_PROPERTY: "wf-300-test"}
        self.rows_by_property = {TOUR_PROPERTY: property_rows(TOUR_PROPERTY), OTHER_PROPERTY: property_rows(OTHER_PROPERTY)}

    def version(self, community_id: int) -> str:
        return self.versions.get(community_id, f"wf-{community_id}-none")

    def graph(self, community_id: int, *, step_free: bool = False, avoid_blockers: bool = True, version: str | None = None) -> BuiltGraph | None:
        rows = self.rows_by_property.get(community_id)
        if rows is None:
            return None
        key = (community_id, self.version(community_id), step_free, avoid_blockers)
        hit = self._cache.get(key)
        if hit:
            return hit
        built = BuiltGraph(version=self.version(community_id), rows=rows, graph=GraphBuilder(rows, step_free=step_free, avoid_blockers=avoid_blockers).build(), built_at=0.0)
        self._cache[key] = built
        return built


class FakeStopsRepository:
    def __init__(self, rows: dict[int, WayfindingRows]):
        self.rows = rows

    def main_tour_id(self, community_id: int) -> int | None:
        r = self.rows.get(community_id)
        return r.main_tour["id"] if r and r.main_tour else None

    def unit_stops(self, community_id: int, tour_id: int) -> list[dict[str, Any]]:
        r = self.rows[community_id]
        seen: set[int] = set()
        out = []
        for ts_row in r.tour_stops:
            if ts_row["stop_type"] != "unit" or ts_row["display_stop"] is False or ts_row["stop_id"] in seen:
                continue
            unit = next((u for u in r.units if u["id"] == ts_row["stop_id"]), None)
            if not unit:
                continue
            seen.add(unit["id"])
            out.append({**unit, "tour_stop_id": ts_row["id"], "sort": ts_row["sort"], "duration_minutes": ts_row["duration_minutes"], "stop_name": ts_row["name"], "square_feet": 850, "description": None, "available": True, "modal_unit": False, "effective_rent": 2400, "market_rent": 2500, "floorplan_name": "A1", "floorplan_bedrooms": "2", "floorplan_bathrooms": 2.0, "floorplan_square_feet": 850})
        return out

    def amenity_stops(self, community_id: int, tour_id: int) -> list[dict[str, Any]]:
        r = self.rows[community_id]
        out = []
        for ts_row in r.tour_stops:
            if ts_row["stop_type"] != "amenity" or ts_row["display_stop"] is False:
                continue
            amenity = next((a for a in r.amenities if a["id"] == ts_row["stop_id"]), None)
            if not amenity:
                continue
            breezway = amenity["id"] != 12  # the Pool's "Show in Stops List" is off
            if not breezway:
                continue
            out.append({**amenity, "tour_stop_id": ts_row["id"], "sort": ts_row["sort"], "duration_minutes": ts_row["duration_minutes"], "stop_name": ts_row["name"], "description": "Open 6-10", "amenity_type": "Fitness", "video_link": None, "video_link_button_label": "PLAY VIDEO", "breezway_lock_visible": True})
        return out


SUPER = UserRow(id=1, email="super@example.test", first_name="Super", last_name="Admin", role="Super admin", company_id=1, company_inactive=False, invitation_pending=False)
MANAGER = UserRow(id=2, email="manager@example.test", first_name="Comm", last_name="Manager", role="Community manager", company_id=1, company_inactive=False, invitation_pending=False)
INACTIVE = UserRow(id=3, email="gone@example.test", first_name="Gone", last_name="Admin", role="Super admin", company_id=9, company_inactive=True, invitation_pending=False)

TOKENS: dict[str, TokenRow] = {
    "tok-super": TokenRow(token_id=1, user=SUPER, revoked_at=None, created_at=NOW - timedelta(hours=1), expires_in=5 * 86400),
    "tok-manager": TokenRow(token_id=2, user=MANAGER, revoked_at=None, created_at=NOW - timedelta(hours=1), expires_in=5 * 86400),
    "tok-inactive": TokenRow(token_id=3, user=INACTIVE, revoked_at=None, created_at=NOW - timedelta(hours=1), expires_in=5 * 86400),
    "tok-expired": TokenRow(token_id=4, user=SUPER, revoked_at=None, created_at=NOW - timedelta(days=6), expires_in=5 * 86400),
    "tok-revoked": TokenRow(token_id=5, user=SUPER, revoked_at=NOW - timedelta(minutes=5), created_at=NOW - timedelta(hours=1), expires_in=5 * 86400),
    "tok-orphan": TokenRow(token_id=6, user=None, revoked_at=None, created_at=NOW - timedelta(hours=1), expires_in=5 * 86400),
}


class FakeUsersRepository:
    def __init__(self):
        self.tokens = dict(TOKENS)

    def find_token(self, token: str) -> TokenRow | None:
        return self.tokens.get(token)


class FakeRails:
    """Stands in for Doorkeeper: email/password pairs → token names from TOKENS."""

    ACCOUNTS = {("super@example.test", "password"): "tok-super", ("manager@example.test", "password"): "tok-manager", ("gone@example.test", "password"): "tok-inactive"}

    def __init__(self):
        self.revoked: list[str] = []
        self.down = False

    def password_grant(self, email: str, password: str) -> GrantedToken:
        if self.down:
            raise ApiError(503, "upstream_unavailable", "down")
        token = self.ACCOUNTS.get((email, password))
        if not token:
            raise ApiError(401, "invalid_credentials", "That email and password do not match.")
        return GrantedToken(access_token=token, token_type="Bearer", expires_in=5 * 86400, created_at=int(NOW.timestamp()))

    def revoke(self, token: str) -> bool:
        self.revoked.append(token)
        return True

    def close(self) -> None:
        pass


class FakePropertiesRepository:
    ROWS = {
        TOUR_PROPERTY: PropertyRow(id=TOUR_PROPERTY, name="Tour Property", address="1 Main St", city="Denver", state="CO", zip="80202", logo_url=None, company_id=1, company_name="Acme", is_sitemap=False, auto_wayfinding=True, tour_enabled=True, locked=False),
        NO_TOUR_PROPERTY: PropertyRow(id=NO_TOUR_PROPERTY, name="Quiet Property", address="2 Side St", city="Austin", state="TX", zip="73301", logo_url=None, company_id=1, company_name="Acme", is_sitemap=False, auto_wayfinding=False, tour_enabled=False, locked=False),
        OTHER_PROPERTY: PropertyRow(id=OTHER_PROPERTY, name="Other Property", address="3 Far Rd", city="Miami", state="FL", zip="33101", logo_url=None, company_id=2, company_name="Beta", is_sitemap=False, auto_wayfinding=True, tour_enabled=True, locked=False),
    }

    def list_all(self) -> list[PropertyRow]:
        return sorted(self.ROWS.values(), key=lambda r: r.name.lower())

    def find(self, property_id: int) -> PropertyRow | None:
        return self.ROWS.get(property_id)

    def counts(self, property_id: int) -> dict[str, int]:
        return {"floorplates": 3, "units": 5, "amenities": 2}


class FakeAssets:
    """Stands in for the S3 fetcher: a valid SVG for `b.svg`, an invalid file for `bad.svg`, unreachable otherwise."""

    SVG = b'<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1412 912"><rect width="10" height="10"/></svg>'

    def __init__(self):
        self.fetched: list[str] = []

    def svg(self, url: str) -> SvgAsset:
        self.fetched.append(url)
        if url.endswith("/b.svg"):
            return SvgAsset(url=url, content=self.SVG, etag="etag-b", view_box=(0.0, 0.0, 1412.0, 912.0))
        if url.endswith("/bad.svg"):
            raise AssetError("invalid_svg", "The floor plan file is not valid SVG.")
        raise AssetError("svg_unavailable", "The floor plan file could not be fetched.")

    def close(self) -> None:
        pass


class FakeDb:
    def ping(self) -> bool:
        return True

    def open(self) -> None:
        pass

    def close(self) -> None:
        pass


def build_container() -> tuple[Container, FakeRails, FakeUsersRepository]:
    settings = Settings(database_url="postgres://unused/unused", rails_url="http://rails.test", env="test")
    engine = FakeEngine(settings)
    rails = FakeRails()
    users = FakeUsersRepository()
    assets = FakeAssets()
    stops = StopsService(FakeStopsRepository(engine.rows_by_property), engine)  # type: ignore[arg-type]
    container = Container(
        settings=settings,
        db=FakeDb(),  # type: ignore[arg-type]
        rails=rails,  # type: ignore[arg-type]
        assets=assets,  # type: ignore[arg-type]
        engine=engine,
        auth=AuthService(users, rails),  # type: ignore[arg-type]
        properties=PropertyService(FakePropertiesRepository(), 60),  # type: ignore[arg-type]
        stops=stops,
        maps=MapService(engine, assets),  # type: ignore[arg-type]
        routing=RoutingService(engine, stops),
    )
    return container, rails, users


@dataclass
class Env:
    client: TestClient
    rails: FakeRails
    users: FakeUsersRepository
    container: Container

    def auth(self, token: str = "tok-super") -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def env() -> Env:
    container, rails, users = build_container()
    app = create_app(settings=container.settings, container=container)
    with TestClient(app, raise_server_exceptions=False) as client:
        yield Env(client=client, rails=rails, users=users, container=container)
