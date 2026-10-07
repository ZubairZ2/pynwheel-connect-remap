"""Map levels and the normalized graph."""
from __future__ import annotations

from typing import Any

from ..errors import ApiError, not_found
from ..integrations.assets import AssetError, AssetFetcher, SvgAsset
from ..schemas.map import BuildingOut, GraphResponse, LevelDetailResponse, LevelOut, MapResponse
from ..wayfinding.engine import WayfindingEngine


class MapService:
    def __init__(self, engine: WayfindingEngine, assets: AssetFetcher | None = None):
        self.engine = engine
        self.assets = assets

    def payload(self, property_id: int) -> dict[str, Any]:
        payload = self.engine.payload(property_id)
        if payload is None:
            raise not_found()
        return payload

    def _level_extras(self, property_id: int) -> dict[str, dict[str, Any]]:
        """Per level: the SVG proxy path and the stored calibration, from the level rows (not part of the Rails-shaped graph payload)."""
        built = self.engine.graph(property_id)
        if built is None:
            raise not_found()
        extras: dict[str, dict[str, Any]] = {}
        for level in built.graph.levels:
            record = level.record
            transform = record.get("svg_to_image_transform")
            if not (isinstance(transform, dict) and all(isinstance(transform.get(k), (int, float)) for k in "abcdef")):
                transform = None
            meta = record.get("svg_metadata")
            size = {"width": meta.get("width"), "height": meta.get("height")} if isinstance(meta, dict) and meta.get("width") and meta.get("height") else None
            extras[level.key] = {
                "svg_path": f"/api/v1/properties/{property_id}/map/levels/{level.key}/svg" if record.get("svg_image") else None,
                "svg_transform": transform,
                "svg_size": size,
            }
        return extras

    def _level_out(self, property_id: int, level: dict[str, Any], extras: dict[str, dict[str, Any]]) -> LevelOut:
        return LevelOut(**level, **extras.get(level["id"], {}))

    def svg(self, property_id: int, level_id: str) -> SvgAsset:
        """The level's floor SVG, fetched server-side and validated."""
        if self.assets is None:
            raise ApiError(503, "svg_unavailable", "Floor plan files are not served by this deployment.")
        payload = self.payload(property_id)
        level = next((l for l in payload["levels"] if l["id"] == level_id), None)
        if level is None:
            raise not_found("No such level on this property.", code="unknown_level")
        if not level.get("svg"):
            raise not_found("This level has no SVG floor plan.", code="no_svg")
        try:
            return self.assets.svg(level["svg"])
        except AssetError as exc:
            raise ApiError(422 if exc.code == "invalid_svg" else 502, exc.code, str(exc))

    def map(self, property_id: int) -> MapResponse:
        payload = self.payload(property_id)
        extras = self._level_extras(property_id)
        levels = [self._level_out(property_id, level, extras) for level in payload["levels"]]
        buildings: list[BuildingOut] = []
        for name in payload["buildings"]:
            buildings.append(BuildingOut(name=name, level_ids=[l.id for l in levels if l.building == name]))
        unassigned = [l.id for l in levels if l.building is None or l.building not in payload["buildings"]]
        if unassigned and not buildings:
            buildings.append(BuildingOut(name=payload["buildings"][0] if payload["buildings"] else "Property", level_ids=unassigned))
        return MapResponse(property_id=property_id, graph_version=payload["version"], is_sitemap=payload["is_sitemap"], auto_wayfinding=payload["auto_wayfinding"], scale=payload["scale"], buildings=buildings, levels=levels)

    def level(self, property_id: int, level_id: str) -> LevelDetailResponse:
        payload = self.payload(property_id)
        level = next((l for l in payload["levels"] if l["id"] == level_id), None)
        if level is None:
            raise not_found("No such level on this property.", code="unknown_level")
        return LevelDetailResponse(
            property_id=property_id,
            graph_version=payload["version"],
            level=self._level_out(property_id, level, self._level_extras(property_id)),
            nodes=[n for n in payload["nodes"] if n["level"] == level_id],
            edges=[e for e in payload["edges"] if e["level"] == level_id],
        )

    def graph(self, property_id: int) -> GraphResponse:
        return GraphResponse(**self.payload(property_id))
