"""Pynwheel Tour App API.

    Capacitor Tour App  →  this FastAPI service  →  the Pynwheel database (read-only)
                                                 →  the Rails CMS (sign in / sign out only)

Run: `uvicorn app.main:app --reload` (see README.md).
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.router import api_v1
from .config import Settings, get_settings
from .container import Container
from .errors import install_handlers

log = logging.getLogger("tour_api")

DESCRIPTION = """
The API the **Pynwheel Tour** mobile app uses. It exposes the existing
Pynwheel data (properties, the Self-Guided Tour's stops list, maps, the
persisted wayfinding graph) and computes routes over that graph.

* **Authentication**: `POST /api/v1/auth/login` with Pynwheel CMS
  credentials. The password is verified by the CMS itself (Doorkeeper
  password grant); only **Super Admin** accounts are admitted. Send the token
  as `Authorization: Bearer <token>`.
* **Errors** always look like `{"success": false, "error": {"code", "message"}}`.
* **Caching**: the graph answers an `ETag` (the graph version) and `304` on
  `If-None-Match`; every map/route response names the `graph_version` it was
  computed from.
"""


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        c = container or Container.build(settings)
        if container is None:
            c.open()
        app.state.container = c
        log.info("tour-api started env=%s rails=%s", settings.env, settings.rails_url)
        try:
            yield
        finally:
            if container is None:
                c.close()

    app = FastAPI(
        title="Pynwheel Tour App API",
        version="1.0.0",
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url=None if settings.production else "/docs",
        redoc_url=None if settings.production else "/redoc",
        openapi_url=None if settings.production else "/openapi.json",
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Authorization", "Content-Type", "If-None-Match"], expose_headers=["ETag", "X-Svg-ViewBox"])
    install_handlers(app)
    app.include_router(api_v1)

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        # Never the query string (no tokens travel there, but never log them anyway) and never the body.
        log.info("%s %s -> %s %.0fms", request.method, request.url.path, response.status_code, elapsed_ms)
        return response

    @app.get("/api/v1/health", tags=["health"], summary="Liveness and database reachability")
    def health(request: Request) -> dict:
        c: Container = request.app.state.container
        return {"success": True, "status": "ok", "database": c.db.ping(), "env": settings.env}

    return app


app = create_app()
