from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from ...schemas.common import ERROR_RESPONSES
from ...schemas.property import PropertyDetail, PropertyListResponse, PropertySummary, TourSummary
from ..deps import ContainerDep, CurrentUser, PropertyDep

router = APIRouter(prefix="/properties", tags=["properties"])


def _summary(row) -> PropertySummary:
    return PropertySummary(id=row.id, name=row.name, address=row.address, city=row.city, state=row.state, zip=row.zip, company=row.company_name, tour_enabled=row.tour_enabled, is_sitemap=row.is_sitemap)


@router.get("", response_model=PropertyListResponse, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403)}, summary="Properties the signed-in user may tour")
def list_properties(container: ContainerDep, user: CurrentUser, q: Annotated[str | None, Query(max_length=120, description="Filter by name, city or address.")] = None, tour_enabled: Annotated[bool, Query(description="Only properties with the Self-Guided Tour on.")] = False) -> PropertyListResponse:
    rows = container.properties.list(user, query=q, tour_only=tour_enabled)
    return PropertyListResponse(properties=[_summary(r) for r in rows], total=len(rows))


@router.get("/{property_id}", response_model=PropertyDetail, responses={k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403, 404)}, summary="One property and its Self-Guided Tour state")
def property_detail(container: ContainerDep, property_row: PropertyDep) -> PropertyDetail:
    counts = container.properties.properties.counts(property_row.id)
    tour: TourSummary | None = None
    buildings: list[str] = []
    version: str | None = None
    if property_row.tour_enabled:
        built = container.engine.graph(property_row.id)
        if built is not None:
            version = built.version
            buildings = list(built.graph.buildings)
            stops = container.stops.list(property_row.id, built)
            main = built.rows.main_tour
            if main:
                tour = TourSummary(id=main["id"], start_node=stops.start_node, starting_floor=main.get("starting_floor"), building=main.get("building") or None, building_order=list(main.get("building_order") or []), stops_total=stops.total)
    base = _summary(property_row).model_dump()
    return PropertyDetail(**base, auto_wayfinding=property_row.auto_wayfinding, floorplates_count=counts.get("floorplates", 0), units_count=counts.get("units", 0), amenities_count=counts.get("amenities", 0), buildings=buildings, tour=tour, graph_version=version)
