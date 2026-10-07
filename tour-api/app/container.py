"""Wires repositories, integrations and services together once per process."""
from __future__ import annotations

from dataclasses import dataclass

from .config import Settings
from .integrations.assets import AssetFetcher
from .integrations.rails import RailsAuthClient
from .repositories.db import Database
from .repositories.properties import PropertiesRepository
from .repositories.stops import StopsRepository
from .repositories.users import UsersRepository
from .services.auth import AuthService
from .services.maps import MapService
from .services.properties import PropertyService
from .services.routing import RoutingService
from .services.stops import StopsService
from .wayfinding.engine import WayfindingEngine


@dataclass
class Container:
    settings: Settings
    db: Database
    rails: RailsAuthClient
    assets: AssetFetcher
    engine: WayfindingEngine
    auth: AuthService
    properties: PropertyService
    stops: StopsService
    maps: MapService
    routing: RoutingService

    @classmethod
    def build(cls, settings: Settings) -> "Container":
        db = Database(settings.database_url, settings.db_pool_min, settings.db_pool_max)
        rails = RailsAuthClient(settings.rails_url, settings.rails_timeout_s)
        from urllib.parse import urlparse

        assets = AssetFetcher(allowed_hosts=tuple(h for h in (urlparse(settings.public_uploads_url).hostname, urlparse(settings.rails_url).hostname) if h))
        engine = WayfindingEngine(db, settings)
        stops = StopsService(StopsRepository(db), engine)
        return cls(
            settings=settings,
            db=db,
            rails=rails,
            assets=assets,
            engine=engine,
            auth=AuthService(UsersRepository(db), rails),
            properties=PropertyService(PropertiesRepository(db), settings.property_list_cache_ttl),
            stops=stops,
            maps=MapService(engine, assets),
            routing=RoutingService(engine, stops),
        )

    def open(self) -> None:
        self.db.open()

    def close(self) -> None:
        self.rails.close()
        self.assets.close()
        self.db.close()
