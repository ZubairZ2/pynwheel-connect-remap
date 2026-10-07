from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    x: float
    y: float


class UnitFacts(BaseModel):
    bedrooms: float | None = Field(description="From the unit's floor plan (`floorplans.bedrooms`); null when unknown.")
    bathrooms: float | None
    square_feet: float | None
    rent: float | None = Field(description="`effective_rent`, else `market_rent`; null when not published (<= 0).")
    available: bool | None
    model: bool = Field(description="`modal_unit`: a model home.")
    floorplan_name: str | None


class AmenityFacts(BaseModel):
    amenity_type: str | None
    video_url: str | None
    video_button_label: str | None


class TourStopOut(BaseModel):
    id: str = Field(description="Stable stop id = the graph node id (`unit:123`, `amenity:45`). Send these back to the route endpoints.")
    type: Literal["unit", "amenity"]
    record_id: int
    tour_stop_id: int = Field(description="The CMS `tour_stops` row that puts it on the stops list.")
    name: str
    description: str | None = Field(description="The record's own description text; never generated.")
    instruction: str | None = Field(description="Directional / stop text the CMS Tour Setup holds (`units.stop_description`, `amenities.directional_text`).")
    building: str | None
    floor: int | None
    level_id: str | None = Field(description="The map level (`floorplate:ID` / `sitemap:ID`) the stop stands on, null when not plotted.")
    floorplate_id: int | None
    location: Location | None = Field(description="Centre pixel on the level (door when the record has one, else its pin).")
    map_node_id: str | None = Field(description="The graph node the stop is routed to (same as `id` when plotted).")
    routable: bool = Field(description="Plotted and joined to a path, so a route can reach it.")
    sort: int | None
    duration_minutes: int | None
    unit: UnitFacts | None = None
    amenity: AmenityFacts | None = None


class StopGroup(BaseModel):
    key: Literal["amenities", "floorplans"]
    label: str
    stops: list[TourStopOut]


class StopsResponse(BaseModel):
    success: bool = True
    property_id: int
    graph_version: str
    tour_id: int | None
    start_node: str | None
    groups: list[StopGroup]
    total: int
