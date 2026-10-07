from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

StepType = Literal["walk", "elevator", "stairs", "ramp", "outdoor", "arrive"]


class RouteRequest(BaseModel):
    from_stop_id: str = Field(description="Graph node id of the start (`tour_start:1`, `unit:101`, `amenity:3`, `elevator:1`, `stop:7`).", min_length=3, max_length=64)
    to_stop_id: str = Field(min_length=3, max_length=64)
    from_floor: int | None = Field(default=None, description="Disambiguates a place that stands on several floors (an elevator).")
    to_floor: int | None = None
    step_free: bool = Field(default=False, description="Avoid stairs and inaccessible connectors.")
    avoid_blockers: bool = Field(default=True)


class TourRouteRequest(BaseModel):
    stop_ids: list[str] = Field(min_length=1, max_length=100, description="The chosen stops (ids from the stops endpoint). Order is decided server-side by the tour's own rule.")
    step_free: bool = False
    avoid_blockers: bool = True


class DistancesRequest(BaseModel):
    stop_ids: list[str] = Field(min_length=1, max_length=500)


class PlaceRef(BaseModel):
    id: str
    type: str | None
    name: str | None


class FloorRef(BaseModel):
    level_id: str | None
    number: int | None
    name: str = Field(description="`Floor 1`, the level's name, or `Property map`.")


class Transition(BaseModel):
    kind: Literal["elevator", "stairs", "ramp", "outdoor"]
    via: str | None = Field(description="The connector ridden (`elevator:1`) or the gate pair for an outdoor walk.")
    name: str | None
    floor_from: int | None
    floor_to: int | None
    from_level_id: str | None
    to_level_id: str | None


class RouteStepOut(BaseModel):
    sequence: int
    type: StepType
    title: str = Field(description='"Walk on Floor 1", "Take Elevator 1 to Floor 3", "Arrive at Fitness Centre".')
    description: str = Field(description='"From Tour start to Fitness Centre · 1,032 px", "Up 2 floors", "Floor 1".')
    instruction: str | None = Field(description="The stop's own directional text when the CMS holds one.")
    distance: float = Field(description="Walked distance of this step in `unit`; 0 for transitions and arrival.")
    unit: Literal["px"]
    distance_ft: float | None
    floor: FloorRef | None
    from_: PlaceRef | None = Field(alias="from")
    to: PlaceRef | None
    leg: int = Field(description="Index into `legs` of the leg this step belongs to.")
    geometry: list[list[float]] = Field(description="Centre-pixel polyline on `floor.level_id` for walk steps; empty otherwise.")
    transition: Transition | None = None
    dwell_s: int | None = Field(default=None, description="Seconds the tour pauses at an arrival (from the stop's duration).")

    model_config = {"populate_by_name": True}


class WalkLegOut(BaseModel):
    index: int
    kind: Literal["walk"]
    level: str | None
    floor: int | None
    building: str | None
    from_: str = Field(alias="from")
    to: str
    length_px: float
    points: list[list[float]]
    nodes: list[str]

    model_config = {"populate_by_name": True}


class TransitionLegOut(BaseModel):
    index: int
    kind: Literal["elevator", "stairs", "ramp", "outdoor"]
    via: str | None
    name: str | None
    floor_from: int | None
    floor_to: int | None
    from_: str = Field(alias="from")
    to: str
    length_px: float = 0

    model_config = {"populate_by_name": True}


class StageOut(BaseModel):
    level_id: str
    floor: int | None
    building: str | None
    leg: int


class RouteOut(BaseModel):
    start: PlaceRef
    destination: PlaceRef
    step_free: bool
    avoid_blockers: bool
    total_distance: float = Field(description="Walked pixels over every walk leg.")
    unit: Literal["px"] = "px"
    total_distance_ft: float | None
    duration_s: int | None = Field(description="Null until the property's levels carry a scale.")
    floors: list[FloorRef]
    buildings: list[str]
    stages: list[StageOut] = Field(description="The levels the route visits in order, with the first leg on each.")
    legs: list[WalkLegOut | TransitionLegOut]
    steps: list[RouteStepOut]
    warnings: list[str]


class RouteResponse(BaseModel):
    success: bool = True
    graph_version: str
    route: RouteOut


class TourSegmentOut(BaseModel):
    stop_id: str
    tour_stop_id: int | None
    from_stop_id: str
    route: RouteOut


class TourRouteResponse(BaseModel):
    success: bool = True
    graph_version: str
    route: RouteOut = Field(description="The whole tour: start → stops in tour order → start.")
    segments: list[TourSegmentOut] = Field(description="One per stop reached, in visiting order; the mobile app plays these stop by stop.")
    skipped: list[str] = Field(description="Stops that could not be reached (also explained in route.warnings).")


class StopDistanceOut(BaseModel):
    reachable: bool
    distance: float
    unit: Literal["px"] = "px"
    distance_ft: float | None
    duration_s: int | None
    direction: Literal["up", "down", "level"]
    error: dict | None = None


class DistancesResponse(BaseModel):
    success: bool = True
    graph_version: str
    from_stop_id: str | None
    distances: dict[str, StopDistanceOut]
