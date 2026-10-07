from __future__ import annotations

from pydantic import BaseModel, Field


class PropertySummary(BaseModel):
    id: int
    name: str
    address: str | None
    city: str | None
    state: str | None
    zip: str | None
    company: str | None = Field(description="The owning company's name.")
    tour_enabled: bool = Field(description="`Connect::ProductState.tour?`: the Self-Guided Tour is on for this property (the `self_tour` setting or the Launch order form).")
    is_sitemap: bool = Field(description="Sitemap mode: one site plan instead of floorplates.")


class PropertyListResponse(BaseModel):
    success: bool = True
    properties: list[PropertySummary]
    total: int


class TourSummary(BaseModel):
    id: int
    start_node: str | None = Field(description="The tour start's graph node (`tour_start:ID`), null when not plotted.")
    starting_floor: int | None
    building: str | None
    building_order: list[str]
    stops_total: int = Field(description="Visible unit/amenity stops on the tour's stops list.")


class PropertyDetail(PropertySummary):
    success: bool = True
    auto_wayfinding: bool
    floorplates_count: int
    units_count: int
    amenities_count: int
    buildings: list[str]
    tour: TourSummary | None = Field(description="Null when the property has no Self-Guided Tour or no main tour record.")
    graph_version: str | None = Field(description="The current graph version (ETag of the graph endpoint); null when the tour is off.")
