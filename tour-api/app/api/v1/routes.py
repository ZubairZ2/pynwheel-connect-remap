from __future__ import annotations

from fastapi import APIRouter

from ...schemas.common import ERROR_RESPONSES
from ...schemas.route import DistancesRequest, DistancesResponse, RouteRequest, RouteResponse, TourRouteRequest, TourRouteResponse
from ..deps import ContainerDep, TourPropertyDep

router = APIRouter(prefix="/properties/{property_id}", tags=["routing"])

_RESPONSES = {k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403, 404, 422)}


@router.post("/route", response_model=RouteResponse, responses=_RESPONSES, summary="Shortest route between two places")
def route(container: ContainerDep, property_row: TourPropertyDep, body: RouteRequest) -> RouteResponse:
    """Dijkstra over the property's persisted graph (hallways, bridges,
    elevators, stairs, outdoor links). Answers ordered legs (one per floor
    walked, with the polyline) and the steps the app shows, or a 422 with the
    wayfinding error code (`no_path`, `not_linked`, `no_step_free`, ...)."""
    return container.routing.route(property_row.id, from_stop_id=body.from_stop_id, to_stop_id=body.to_stop_id, from_floor=body.from_floor, to_floor=body.to_floor, step_free=body.step_free, avoid_blockers=body.avoid_blockers)


@router.post("/tour-route", response_model=TourRouteResponse, responses=_RESPONSES, summary="The route through the chosen stops")
def tour_route(container: ContainerDep, property_row: TourPropertyDep, body: TourRouteRequest) -> TourRouteResponse:
    """Validates that every chosen stop is on this property's stops list, orders
    them by the tour's own rule (building order, floor, Tour Setup sort), and
    routes tour start → stops → tour start. `segments` holds the route that
    reaches each stop, for the stop-by-stop screens."""
    return container.routing.tour_route(property_row.id, body)


@router.post("/stops/distances", response_model=DistancesResponse, responses=_RESPONSES, summary="Distance from the tour start to each stop")
def distances(container: ContainerDep, property_row: TourPropertyDep, body: DistancesRequest) -> DistancesResponse:
    return container.routing.distances(property_row.id, body.stop_ids)
