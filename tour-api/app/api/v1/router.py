from __future__ import annotations

from fastapi import APIRouter

from . import auth, maps, properties, routes, stops

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
api_v1.include_router(properties.router)
api_v1.include_router(stops.router)
api_v1.include_router(maps.router)
api_v1.include_router(routes.router)
