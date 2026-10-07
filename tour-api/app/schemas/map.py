from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class LevelOut(BaseModel):
    id: str = Field(description="`floorplate:ID` or `sitemap:ID`.")
    kind: Literal["floorplate", "sitemap"]
    name: str | None
    building: str | None
    floors: list[int] = Field(description="The floors this plan stands for; several for a stacked floorplate, empty for the sitemap.")
    image: str | None = Field(description="Background image URL (S3), null when none is stored.")
    svg: str | None = Field(description="Floor SVG URL when the level has one.")
    width: int | None
    height: int | None
    space: str = Field(description="Coordinate frame of every x/y on this level: `raster` = floor-image pixels.")
    scale_ft_per_px: float | None = Field(description="Real-world scale; null means distances are pixels.")
    version: int | None = Field(description="The level's wayfinding_version counter.")
    svg_path: str | None = Field(default=None, description="API path that serves this level's floor SVG (bearer token required; the stored file lives on S3 without CORS), null when the level has none.")
    svg_transform: dict[str, Any] | None = Field(default=None, description="Calibrated affine map from SVG viewBox units to level pixels (`svg_to_image_transform`: x' = a·x + c·y + e, y' = b·x + d·y + f), null when none is stored: the SVG then fills the level frame as the CMS draws it.")
    svg_size: dict[str, Any] | None = Field(default=None, description="The SVG's intrinsic width/height as recorded at upload (`svg_metadata`), when known.")


class BuildingOut(BaseModel):
    name: str
    level_ids: list[str]


class MapResponse(BaseModel):
    success: bool = True
    property_id: int
    graph_version: str
    is_sitemap: bool
    auto_wayfinding: bool
    scale: dict[str, Any]
    buildings: list[BuildingOut]
    levels: list[LevelOut]


class GraphNodeOut(BaseModel):
    id: str = Field(description="Typed id: hallway:12, unit:101, amenity:3, elevator:1, bsp:1, tour_start:1, stop:7, door:4.")
    kind: str
    level: str
    floor: int | None
    building: str | None
    name: str | None
    x: float
    y: float
    anchor: Literal["icon_top_left", "door", "point"] = Field(description="What x/y anchor: a legacy icon's top-left (+8 = centre), a door, or the point itself.")
    review: str | None = None
    attach: str | None = Field(default=None, description="The hallway node this place joins the paths at.")
    link: str | None = Field(default=None, description="explicit | nearest | detached | none.")
    lock_provider: str | None = None
    note: str | None = Field(default=None, description="Visitor instruction read out on arrival (directional text).")
    vertical: str | None = Field(default=None, description="elevator | stairs | ramp for connector nodes.")
    accessible: bool | None = None
    floors_served: list[int] | None = None
    positions: dict[str, Any] | None = None
    radius_px: float | None = None


class GraphEdgeOut(BaseModel):
    from_: str = Field(alias="from")
    to: str
    kind: Literal["walk"]
    path_kind: str
    level: str
    length_px: float
    polyline: list[list[float]]

    model_config = {"populate_by_name": True}


class VerticalConnectionOut(BaseModel):
    id: str
    kind: str
    floors: list[int]
    accessible: bool | None
    levels: list[str]


class GateOut(BaseModel):
    id: str
    building: str | None
    kind: str


class TourStopRefOut(BaseModel):
    tour_stop_id: int
    node: str | None
    stop_type: str | None
    name: str | None
    sort: int | None
    visible: bool
    duration_minutes: int | None
    on_map: bool


class TourInfoOut(BaseModel):
    id: int
    start: str | None
    starting_floor: int | None
    building: str | None
    building_order: list[str]
    version: int | None
    stops: list[TourStopRefOut]


class GraphResponse(BaseModel):
    success: bool = True
    version: str = Field(description="Graph version: the ETag of this response and the cache key of every route.")
    community_id: int
    is_sitemap: bool
    auto_wayfinding: bool
    scale: dict[str, Any]
    levels: list[LevelOut]
    buildings: list[str]
    nodes: list[GraphNodeOut]
    edges: list[GraphEdgeOut]
    vertical_connections: list[VerticalConnectionOut]
    gates: list[GateOut]
    tour: TourInfoOut | None


class LevelDetailResponse(BaseModel):
    success: bool = True
    property_id: int
    graph_version: str
    level: LevelOut
    nodes: list[GraphNodeOut] = Field(description="Every node standing on this level (places, connectors, hallway points).")
    edges: list[GraphEdgeOut] = Field(description="The hallway paths drawn on this level.")
