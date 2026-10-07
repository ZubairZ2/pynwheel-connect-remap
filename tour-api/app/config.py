"""Runtime configuration (environment variables prefixed TOUR_API_)."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TOUR_API_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(default="postgres://localhost/pynwheel_development", description="The Pynwheel Postgres database; opened read-only.")
    rails_url: str = Field(default="http://127.0.0.1:3000", description="The Rails CMS base URL (Doorkeeper login / logout).")
    rails_timeout_s: float = Field(default=15.0)
    public_uploads_url: str = Field(default="", description="Base for upload URLs that have no S3 copy (development).")
    cors_origins: str = Field(default="http://127.0.0.1:3012,http://localhost:3012,capacitor://localhost,http://localhost,https://localhost,ionic://localhost")
    env: str = Field(default="development")
    log_level: str = Field(default="INFO")
    graph_cache_ttl: int = Field(default=900, description="Seconds a built graph stays cached under one graph version.")
    property_list_cache_ttl: int = Field(default=60)
    db_pool_min: int = Field(default=1)
    db_pool_max: int = Field(default=8)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def production(self) -> bool:
        return self.env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
