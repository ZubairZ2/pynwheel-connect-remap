"""Routes for the Tour App: the Rails engine's legs and steps (ported), adapted
into the stop-by-stop contract the mobile screens render.

Every title and description is assembled from real route data: the leg's
level and floor, the names of the nodes the route passes, the pixel length,
and the stop's own directional text when the CMS holds one. Nothing is
hard-coded and nothing is generated.
"""
from __future__ import annotations

from typing import Any

from ..errors import ApiError, not_found, unprocessable
from ..repositories.rubyisms import strip_html
from ..schemas.route import DistancesResponse, FloorRef, PlaceRef, RouteOut, RouteResponse, RouteStepOut, StageOut, StopDistanceOut, TourRouteRequest, TourRouteResponse, TourSegmentOut, Transition, TransitionLegOut, WalkLegOut
from ..wayfinding.engine import BuiltGraph, WayfindingEngine
from ..wayfinding.models import Graph, Node
from ..wayfinding.route_service import Leg, Result, RouteService
from . import timing_text
from .stops import StopsService


def _place(graph: Graph, key: str | None) -> PlaceRef | None:
    if not key:
        return None
    node = graph.nodes.get(key)
    return PlaceRef(id=key, type=node.kind if node else None, name=timing_text.name_of(node, key))


def _floor_ref(graph: Graph, level_key: str | None, floor: int | None) -> FloorRef:
    return FloorRef(level_id=level_key, number=floor, name=timing_text.place_name(graph, level_key, floor))


def _format_px(value: float) -> str:
    return f"{int(round(value)):,} px"


def _format_distance(graph: Graph, leg: Leg) -> str:
    level = graph.level(leg.level_key)
    scale = level.record.get("scale_ft_per_px") if level else None
    if scale is not None and float(scale) > 0:
        return f"{int(round(leg.length_px * float(scale))):,} ft"
    return _format_px(leg.length_px)


def _feet(graph: Graph, leg: Leg) -> float | None:
    level = graph.level(leg.level_key)
    scale = level.record.get("scale_ft_per_px") if level else None
    return round(leg.length_px * float(scale), 1) if scale is not None and float(scale) > 0 else None


def _stages(legs: list[Leg]) -> list[StageOut]:
    stages: list[StageOut] = []
    for leg in legs:
        if leg.kind != "walk" or leg.level_key is None:
            continue
        last = stages[-1] if stages else None
        if last is None or last.level_id != leg.level_key or last.floor != leg.floor:
            stages.append(StageOut(level_id=leg.level_key, floor=leg.floor, building=leg.building, leg=leg.index))
    return stages


def _steps(graph: Graph, legs: list[Leg], dwell_s: int | None) -> list[RouteStepOut]:
    out: list[RouteStepOut] = []
    sequence = 1
    for leg in legs:
        if leg.kind == "walk":
            if len(leg.points) < 2 and len(legs) > 1:
                continue  # a zero-length walk (arriving at the connector itself) is not a step, as in the Rails engine
            frm = _place(graph, leg.frm)
            to = _place(graph, leg.to)
            floor = _floor_ref(graph, leg.level_key, leg.floor)
            out.append(
                RouteStepOut(
                    sequence=sequence, type="walk", title=f"Walk on {floor.name}", description=f"From {frm.name if frm else leg.frm} to {to.name if to else leg.to} · {_format_distance(graph, leg)}",
                    instruction=None, distance=round(leg.length_px, 1), unit="px", distance_ft=_feet(graph, leg), floor=floor, **{"from": frm}, to=to, leg=leg.index,
                    geometry=[[round(x, 2), round(y, 2)] for x, y in leg.points],
                )
            )
        elif leg.kind in ("elevator", "stairs", "ramp"):
            floors = max(1, abs((leg.floor_to or 0) - (leg.floor_from or 0))) if leg.floor_from is not None and leg.floor_to is not None else 1
            direction = "Down" if leg.floor_to is not None and leg.floor_from is not None and leg.floor_to < leg.floor_from else "Up"
            verb = "Take the stairs" if leg.kind == "stairs" else "Take the ramp" if leg.kind == "ramp" else f"Take {leg.name or 'the elevator'}"
            via_node = graph.nodes.get(leg.via or "")
            from_copy_level = graph.nodes.get(leg.frm).level_key if graph.nodes.get(leg.frm) else None
            out.append(
                RouteStepOut(
                    sequence=sequence, type=leg.kind, title=f"{verb} to Floor {leg.floor_to}", description=f"{direction} {floors} {'floor' if floors == 1 else 'floors'}",
                    instruction=strip_html(via_node.note) if via_node else None, distance=0, unit="px", distance_ft=None, floor=_floor_ref(graph, None, leg.floor_to), **{"from": _place(graph, leg.frm)}, to=_place(graph, leg.to), leg=leg.index, geometry=[],
                    transition=Transition(kind=leg.kind, via=leg.via, name=leg.name, floor_from=leg.floor_from, floor_to=leg.floor_to, from_level_id=from_copy_level, to_level_id=_next_walk_level(legs, leg.index)),
                )
            )
        elif leg.kind == "outdoor":
            parts = (leg.name or "").split("|")
            out_name = parts[0] if parts else ""
            in_name = parts[1] if len(parts) > 1 else ""
            to = _place(graph, leg.to)
            out.append(
                RouteStepOut(
                    sequence=sequence, type="outdoor", title=f"Walk outside to {to.name if to else leg.to}", description=f"Leave by {out_name}, enter by {in_name}",
                    instruction=None, distance=0, unit="px", distance_ft=None, floor=None, **{"from": _place(graph, leg.frm)}, to=to, leg=leg.index, geometry=[],
                    transition=Transition(kind="outdoor", via=leg.name, name=leg.name, floor_from=leg.floor_from, floor_to=leg.floor_to, from_level_id=_prev_walk_level(legs, leg.index), to_level_id=_next_walk_level(legs, leg.index)),
                )
            )
        else:
            continue
        sequence += 1
    if legs:
        last = legs[-1]
        destination = graph.nodes.get(last.to)
        floor = _floor_ref(graph, last.level_key, last.floor)
        out.append(
            RouteStepOut(
                sequence=sequence, type="arrive", title=f"Arrive at {timing_text.name_of(destination, last.to)}", description=floor.name,
                instruction=strip_html(destination.note) if destination else None, distance=0, unit="px", distance_ft=None, floor=floor, **{"from": _place(graph, last.frm)}, to=_place(graph, last.to), leg=last.index, geometry=[], dwell_s=dwell_s,
            )
        )
    return out


def _next_walk_level(legs: list[Leg], index: int) -> str | None:
    for leg in legs[index + 1 :]:
        if leg.kind == "walk":
            return leg.level_key
    return None


def _prev_walk_level(legs: list[Leg], index: int) -> str | None:
    for leg in reversed(legs[:index]):
        if leg.kind == "walk":
            return leg.level_key
    return None


def _legs(legs: list[Leg]) -> list[WalkLegOut | TransitionLegOut]:
    out: list[WalkLegOut | TransitionLegOut] = []
    for leg in legs:
        if leg.kind == "walk":
            out.append(WalkLegOut(index=leg.index, kind="walk", level=leg.level_key, floor=leg.floor, building=leg.building, **{"from": leg.frm}, to=leg.to, length_px=round(leg.length_px, 1), points=[[round(x, 2), round(y, 2)] for x, y in leg.points], nodes=list(leg.nodes)))
        else:
            out.append(TransitionLegOut(index=leg.index, kind=leg.kind, via=leg.via, name=leg.name, floor_from=leg.floor_from, floor_to=leg.floor_to, **{"from": leg.frm}, to=leg.to, length_px=0))
    return out


def route_out(graph: Graph, result: Result, *, step_free: bool, avoid_blockers: bool, dwell_s: int | None = None, steps: list[RouteStepOut] | None = None) -> RouteOut:
    legs = result.legs
    floors: list[FloorRef] = []
    seen: set[tuple[str | None, int | None]] = set()
    for leg in legs:
        if leg.kind == "walk" and (leg.level_key, leg.floor) not in seen:
            seen.add((leg.level_key, leg.floor))
            floors.append(_floor_ref(graph, leg.level_key, leg.floor))
    buildings = list(dict.fromkeys(leg.building for leg in legs if leg.kind == "walk" and leg.building))
    return RouteOut(
        start=_place(graph, result.frm) or PlaceRef(id=result.frm or "", type=None, name=result.frm),
        destination=_place(graph, result.to) or PlaceRef(id=result.to or "", type=None, name=result.to),
        step_free=step_free,
        avoid_blockers=avoid_blockers,
        total_distance=result.length_px,
        unit="px",
        total_distance_ft=result.length_ft,
        duration_s=result.duration_s,
        floors=floors,
        buildings=buildings,
        stages=_stages(legs),
        legs=_legs(legs),
        steps=steps if steps is not None else _steps(graph, legs, dwell_s),
        warnings=list(result.warnings),
    )


def _tour_steps(graph: Graph, result: Result) -> list[RouteStepOut]:
    """The whole tour's steps: each segment's steps in order (arrivals included), renumbered, leg indexes offset into the whole."""
    out: list[RouteStepOut] = []
    offset = 0
    for segment in result.segments or []:
        dwell = (segment.tour_stop.get("duration_minutes") or 0) * 60 if segment.tour_stop else None
        for step in _steps(graph, segment.result.legs, dwell):
            out.append(step.model_copy(update={"sequence": len(out) + 1, "leg": step.leg + offset}))
        offset += len(segment.result.legs)
    return out


class RoutingService:
    def __init__(self, engine: WayfindingEngine, stops: StopsService):
        self.engine = engine
        self.stops = stops

    def _graphs(self, property_id: int, *, step_free: bool, avoid_blockers: bool) -> tuple[BuiltGraph, Graph | None]:
        version = self.engine.version(property_id)
        built = self.engine.graph(property_id, step_free=step_free, avoid_blockers=avoid_blockers, version=version)
        if built is None:
            raise not_found()
        open_graph = self.engine.graph(property_id, step_free=step_free, avoid_blockers=False, version=version) if avoid_blockers else None
        return built, open_graph.graph if open_graph else None

    @staticmethod
    def _fail(result: Result, version: str) -> ApiError:
        error = result.error or {"code": "no_path", "message": "No path connects those two places."}
        details: dict[str, Any] = {"from": result.frm, "to": result.to}
        if error.get("details"):
            details.update(error["details"])
        if result.warnings:
            details["warnings"] = result.warnings
        details["graph_version"] = version
        return unprocessable(error["code"], error["message"], details)

    def route(self, property_id: int, *, from_stop_id: str, to_stop_id: str, from_floor: int | None, to_floor: int | None, step_free: bool, avoid_blockers: bool) -> RouteResponse:
        built, open_graph = self._graphs(property_id, step_free=step_free, avoid_blockers=avoid_blockers)
        result = RouteService(built.graph, from_key=from_stop_id, to_key=to_stop_id, from_floor=from_floor, to_floor=to_floor, open_graph=open_graph).call()
        if not result.ok:
            raise self._fail(result, built.version)
        return RouteResponse(graph_version=built.version, route=route_out(built.graph, result, step_free=step_free, avoid_blockers=avoid_blockers))

    def tour_route(self, property_id: int, request: TourRouteRequest) -> TourRouteResponse:
        built, open_graph = self._graphs(property_id, step_free=request.step_free, avoid_blockers=request.avoid_blockers)
        wanted = list(dict.fromkeys(request.stop_ids))  # duplicates collapse to one visit
        selectable = self.stops.selectable_ids(property_id, built)
        invalid = [s for s in wanted if s not in selectable]
        if invalid:
            raise unprocessable("invalid_stop", "Some chosen stops are not on this property's stops list.", {"invalid_stops": invalid})
        result = RouteService(built.graph, open_graph=open_graph).tour(stop_keys=wanted)
        if not result.ok:
            raise self._fail(result, built.version)
        segments = []
        for segment in result.segments or []:
            if segment.tour_stop is None:
                continue  # the return to the start is part of the whole route, not a stop the visitor reaches
            dwell = (segment.tour_stop.get("duration_minutes") or 0) * 60
            segments.append(TourSegmentOut(stop_id=segment.node_key, tour_stop_id=segment.tour_stop["id"], from_stop_id=segment.frm, route=route_out(built.graph, segment.result, step_free=request.step_free, avoid_blockers=request.avoid_blockers, dwell_s=dwell)))
        reached = {s.stop_id for s in segments}
        whole = route_out(built.graph, result, step_free=request.step_free, avoid_blockers=request.avoid_blockers, steps=_tour_steps(built.graph, result))
        return TourRouteResponse(graph_version=built.version, route=whole, segments=segments, skipped=[s for s in wanted if s not in reached])

    def distances(self, property_id: int, stop_ids: list[str]) -> DistancesResponse:
        built, open_graph = self._graphs(property_id, step_free=False, avoid_blockers=True)
        measured = RouteService(built.graph, open_graph=open_graph).distances(list(dict.fromkeys(stop_ids)))
        start = next((k for k in built.graph.nodes if k.startswith("tour_start:")), None)
        return DistancesResponse(
            graph_version=built.version,
            from_stop_id=start,
            distances={key: StopDistanceOut(reachable=d.ok, distance=round(d.length_px, 1), unit="px", distance_ft=d.length_ft, duration_s=d.duration_s, direction=d.direction, error=d.error) for key, d in measured.items()},
        )
