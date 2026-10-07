"""Build Your Tour: the real selectable destinations of a property."""
from __future__ import annotations

from typing import Any

from ..repositories.rubyisms import presence, strip_html, to_f
from ..repositories.stops import StopsRepository
from ..schemas.stop import AmenityFacts, Location, StopGroup, StopsResponse, TourStopOut, UnitFacts
from ..wayfinding.engine import BuiltGraph, WayfindingEngine
from ..wayfinding.models import Graph


def _rent(row: dict[str, Any]) -> float | None:
    for key in ("effective_rent", "market_rent"):
        value = row.get(key)
        if value is not None and to_f(value) > 0:
            return to_f(value)
    return None


def _node_facts(graph: Graph, key: str) -> tuple[str | None, Location | None, bool]:
    node = graph.nodes.get(key)
    if node is None:
        return None, None, False
    routable = node.link in ("explicit", "nearest") and any(c.linked for c in graph.copy_nodes.values() if c.node.key == key)
    return node.level_key, Location(x=node.x, y=node.y), routable


class StopsService:
    def __init__(self, stops: StopsRepository, engine: WayfindingEngine):
        self.stops = stops
        self.engine = engine

    def list(self, property_id: int, built: BuiltGraph | None = None) -> StopsResponse:
        built = built or self.engine.graph(property_id)
        if built is None:
            raise LookupError(property_id)
        graph = built.graph
        tour_id = self.stops.main_tour_id(property_id)
        amenities: list[TourStopOut] = []
        units: list[TourStopOut] = []
        if tour_id is not None:
            for row in self.stops.amenity_stops(property_id, tour_id):
                key = f"amenity:{row['id']}"
                level_id, location, routable = _node_facts(graph, key)
                amenities.append(
                    TourStopOut(
                        id=key, type="amenity", record_id=row["id"], tour_stop_id=row["tour_stop_id"], name=row.get("name") or row.get("stop_name") or f"Amenity {row['id']}",
                        description=strip_html(row.get("description")), instruction=strip_html(row.get("directional_text")), building=presence(row.get("building")), floor=row.get("floor"),
                        level_id=level_id, floorplate_id=row.get("amenityable_id") if row.get("amenityable_type") == "Floorplate" else None, location=location, map_node_id=key if level_id else None,
                        routable=routable, sort=row.get("sort"), duration_minutes=row.get("duration_minutes"),
                        amenity=AmenityFacts(amenity_type=presence(row.get("amenity_type")), video_url=presence(row.get("video_link")), video_button_label=presence(row.get("video_link_button_label"))),
                    )
                )
            for row in self.stops.unit_stops(property_id, tour_id):
                key = f"unit:{row['id']}"
                level_id, location, routable = _node_facts(graph, key)
                units.append(
                    TourStopOut(
                        id=key, type="unit", record_id=row["id"], tour_stop_id=row["tour_stop_id"], name=row.get("marketing_name") or row.get("stop_name") or f"Unit {row['id']}",
                        description=strip_html(row.get("description")), instruction=strip_html(row.get("stop_description")), building=presence(row.get("building")), floor=row.get("floor"),
                        level_id=level_id, floorplate_id=row.get("floorplate_id"), location=location, map_node_id=key if level_id else None,
                        routable=routable, sort=row.get("sort"), duration_minutes=row.get("duration_minutes"),
                        unit=UnitFacts(
                            bedrooms=to_f(row["floorplan_bedrooms"]) if row.get("floorplan_bedrooms") not in (None, "") else None,
                            bathrooms=to_f(row["floorplan_bathrooms"]) if row.get("floorplan_bathrooms") is not None else None,
                            square_feet=to_f(row["square_feet"]) if row.get("square_feet") else (to_f(row["floorplan_square_feet"]) if row.get("floorplan_square_feet") else None),
                            rent=_rent(row), available=row.get("available"), model=bool(row.get("modal_unit")), floorplan_name=presence(row.get("floorplan_name")),
                        ),
                    )
                )
        # Tour order: the same rule the routes use (building order, floor, sort, id).
        building_index = {b: i for i, b in enumerate(graph.buildings)}

        def order(stop: TourStopOut) -> tuple:
            return (building_index.get(stop.building or "", 0), stop.floor if stop.floor is not None else 0, stop.sort if stop.sort is not None else 1 << 30, stop.tour_stop_id)

        amenities.sort(key=order)
        units.sort(key=order)
        start = next((k for k in graph.nodes if k.startswith("tour_start:")), None)
        return StopsResponse(
            property_id=property_id,
            graph_version=built.version,
            tour_id=tour_id,
            start_node=start,
            groups=[StopGroup(key="amenities", label="Amenities", stops=amenities), StopGroup(key="floorplans", label="Floorplans", stops=units)],
            total=len(amenities) + len(units),
        )

    def selectable_ids(self, property_id: int, built: BuiltGraph | None = None) -> set[str]:
        response = self.list(property_id, built)
        return {stop.id for group in response.groups for stop in group.stops}
