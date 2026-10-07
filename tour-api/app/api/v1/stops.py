from __future__ import annotations

from fastapi import APIRouter

from ...schemas.common import ERROR_RESPONSES
from ...schemas.stop import StopsResponse
from ..deps import ContainerDep, TourPropertyDep

router = APIRouter(prefix="/properties/{property_id}", tags=["stops"])


@router.get("/stops", response_model=StopsResponse, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403, 404, 422)}, summary="Build Your Tour: the selectable stops")
def stops(container: ContainerDep, property_row: TourPropertyDep) -> StopsResponse:
    """The units and amenities on the property's **stops list** (the CMS's
    "Show in Stops List" state, read from the main tour's `tour_stops` and,
    for amenities, the amenity's own flag), grouped as the app shows them.
    Each carries its map node, location and whether a route can reach it."""
    return container.stops.list(property_row.id)
