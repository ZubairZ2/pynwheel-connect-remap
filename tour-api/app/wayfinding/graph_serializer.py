"""A port of `Wayfinding::GraphSerializer`: the Tour App's view of a
property's wayfinding graph - levels, nodes, edges, vertical connections,
gates and the tour - with stable typed ids and stored coordinates (each node
says what its coordinates anchor: an icon's top-left or the point itself).
Never the access codes. The output is the Rails API's payload, key for key,
so the parity harness can diff the two."""
from __future__ import annotations

from typing import Any

from ..repositories.rubyisms import present, presence
from .graph_builder import ICON_OFFSET, LEGACY_ICON_KINDS
from .models import Graph, LevelInfo, Node
from .route_service import STOP_TYPE_KEYS
from . import upload_url


class GraphSerializer:
    def __init__(self, graph: Graph, *, version: str, public_base: str, bucket_hint: str | None):
        self.graph = graph
        self.version = version
        self.public_base = public_base
        self.bucket_hint = upload_url.s3_base(bucket_hint)

    def as_json(self) -> dict[str, Any]:
        g = self.graph
        community = g.community
        return {
            "success": True,
            "version": self.version,
            "community_id": community["id"],
            "is_sitemap": present(community.get("is_sitemap")),
            "auto_wayfinding": present(community.get("auto_wayfinding")),
            "scale": {"unit": "px", "ft_per_px": None},
            "levels": [self.level_json(level) for level in g.levels],
            "buildings": list(g.buildings),
            "nodes": [self.node_json(node) for nodes in g.node_levels.values() for node in nodes],
            "edges": [self.edge_json(edge) for edge in g.logical_edges],
            "vertical_connections": self.vertical_connections(),
            "gates": [{"id": node.key, "building": node.building, "kind": node.kind} for node in g.gates],
            "tour": self.tour_json(),
        }

    def level_json(self, level: LevelInfo) -> dict[str, Any]:
        record = level.record
        model = "floorplate" if level.kind == "floorplate" else "sitemap"
        scale = record.get("scale_ft_per_px")
        return {
            "id": level.key,
            "kind": level.kind,
            "name": "Property map" if level.kind == "sitemap" else record.get("name"),
            "building": level.building,
            "floors": list(level.floors),
            "image": upload_url.image_url(record, public_base=self.public_base, bucket_hint=self.bucket_hint),
            "svg": upload_url.upload_url(record, "svg_image", model, public_base=self.public_base, bucket=self.bucket_hint),
            "width": int(round(level.width)) if level.width > 0 else None,
            "height": int(round(level.height)) if level.height > 0 else None,
            "space": level.space,
            "scale_ft_per_px": float(scale) if scale is not None else None,
            "version": record.get("wayfinding_version"),
        }

    def floor_of(self, node: Node) -> int | None:
        if node.floor is not None:
            return node.floor
        level = self.graph.level(node.level_key)
        floors = level.floors if level else []
        return floors[0] if len(floors) == 1 else None

    @staticmethod
    def legacy_icon(node: Node) -> bool:
        return node.kind in LEGACY_ICON_KINDS and node.record_type != "WayfindingStop"

    def node_json(self, node: Node) -> dict[str, Any]:
        legacy = self.legacy_icon(node)
        json: dict[str, Any] = {
            "id": node.key,
            "kind": node.kind,
            "level": node.level_key,
            "floor": self.floor_of(node),
            "building": node.building,
            "name": node.name,
            "x": node.x - ICON_OFFSET if legacy else node.x,
            "y": node.y - ICON_OFFSET if legacy else node.y,
            "anchor": "icon_top_left" if legacy else "door" if node.anchor == "door" else "point",
        }
        if node.kind == "hallway":
            json["review"] = node.review
        if node.kind not in ("hallway", "blocker"):
            json["attach"] = node.attach
            json["link"] = node.link
        if node.lock_provider:
            json["lock_provider"] = node.lock_provider
        if node.note:
            json["note"] = node.note
        if node.kind == "elevator":
            json["vertical"] = node.vertical
            json["accessible"] = node.accessible
            json["floors_served"] = list(node.served or [])
            positions = node.record.get("floor_positions")
            if isinstance(positions, dict) and positions:
                json["positions"] = positions
        if node.kind == "blocker":
            json["radius_px"] = node.radius
        return json

    @staticmethod
    def edge_json(edge: Any) -> dict[str, Any]:
        return {"from": edge.a, "to": edge.b, "kind": "walk", "path_kind": edge.kind, "level": edge.level_key, "length_px": round(edge.length, 1), "polyline": [[round(x, 2), round(y, 2)] for x, y in edge.polyline]}

    def vertical_connections(self) -> list[dict[str, Any]]:
        g = self.graph
        return [
            {"id": node.key, "kind": node.vertical, "floors": list(node.served or []), "accessible": node.accessible, "levels": [n.level_key for n in g.instances(node.key)]}
            for node in g.nodes.values()
            if node.kind == "elevator"
        ]

    def tour_json(self) -> dict[str, Any] | None:
        g = self.graph
        tour = g.tour
        if not tour:
            return None
        start = next((k for k in g.nodes if k.startswith("tour_start:")), None)
        stops = []
        for ts in g.tour_stops:
            key = STOP_TYPE_KEYS.get(ts.get("stop_type"))
            node_key = f"{key}:{'' if ts.get('stop_id') is None else ts['stop_id']}" if key else None  # Ruby interpolates nil as ""
            stops.append(
                {
                    "tour_stop_id": ts["id"],
                    "node": node_key,
                    "stop_type": ts.get("stop_type"),
                    "name": ts.get("name"),
                    "sort": ts.get("sort"),
                    "visible": ts.get("display_stop") is not False,
                    "duration_minutes": ts.get("duration_minutes"),
                    "on_map": node_key in g.nodes if node_key else False,
                }
            )
        return {
            "id": tour["id"],
            "start": start,
            "starting_floor": tour.get("starting_floor"),
            "building": presence(tour.get("building")),
            "building_order": list(tour.get("building_order") or []),
            "version": tour.get("tour_setup_version"),
            "stops": stops,
        }


def route_json(result: Any, *, version: str, step_free: bool, avoid_blockers: bool) -> dict[str, Any]:
    """`Wayfinding::RouteSerializer` (the Rails route payload), for the parity harness and the adapters."""
    if not result.ok:
        return {"success": False, "version": version, "from": result.frm, "to": result.to, "error": result.error, "warnings": result.warnings}
    return {
        "success": True,
        "version": version,
        "from": result.frm,
        "to": result.to,
        "step_free": step_free,
        "avoid_blockers": avoid_blockers,
        "length_px": result.length_px,
        "length_ft": result.length_ft,
        "duration_s": result.duration_s,
        "legs": [leg_json(leg) for leg in result.legs],
        "steps": result.steps,
        "warnings": result.warnings,
    }


def leg_json(leg: Any) -> dict[str, Any]:
    json: dict[str, Any] = {"index": leg.index, "kind": leg.kind}
    if leg.kind == "walk":
        json.update(level=leg.level_key, floor=leg.floor, building=leg.building, **{"from": leg.frm}, to=leg.to, length_px=round(leg.length_px, 1), points=[[round(x, 2), round(y, 2)] for x, y in leg.points], nodes=list(leg.nodes))
    else:
        json.update(via=leg.via, name=leg.name, floor_from=leg.floor_from, floor_to=leg.floor_to, **{"from": leg.frm}, to=leg.to, length_px=0)
    return json
