"""Every persisted row the graph of one property is built from, read in one
pass (the same scopes `Wayfinding::GraphBuilder#load_rows` uses)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..repositories.db import Database


@dataclass
class WayfindingRows:
    community: dict[str, Any]
    floorplates: list[dict[str, Any]] = field(default_factory=list)
    sitemap: dict[str, Any] | None = None
    hallways: list[dict[str, Any]] = field(default_factory=list)
    hallway_edges: list[dict[str, Any]] = field(default_factory=list)
    attachments: list[dict[str, Any]] = field(default_factory=list)
    stops: list[dict[str, Any]] = field(default_factory=list)
    units: list[dict[str, Any]] = field(default_factory=list)
    amenities: list[dict[str, Any]] = field(default_factory=list)
    doors: list[dict[str, Any]] = field(default_factory=list)
    elevators: list[dict[str, Any]] = field(default_factory=list)
    bsps: list[dict[str, Any]] = field(default_factory=list)
    main_tour: dict[str, Any] | None = None
    tour_stops: list[dict[str, Any]] = field(default_factory=list)
    unit_buildings: list[str | None] = field(default_factory=list)
    amenity_buildings: list[str | None] = field(default_factory=list)
    bucket_hint: str | None = None


COMMUNITY_SQL = "select id, name, is_sitemap, auto_wayfinding, self_tour, product_options from communities where id = %s"
FLOORPLATES_SQL = """
    select id, name, number, building, range, image, standard_image_url, svg_image, width, height, scale_ft_per_px, wayfinding_version, svg_to_image_transform, svg_metadata
    from floorplates where community_id = %s order by number desc nulls last, id"""
SITEMAP_SQL = "select id, image, svg_image, width, height, scale_ft_per_px, wayfinding_version, svg_to_image_transform, svg_metadata from sitemaps where community_id = %s order by id limit 1"
HALLWAYS_SQL = """
    select id, x_plot, y_plot, parent_type, parent_id, next_points, review_status
    from hallways where community_id = %s and space = 'raster' and review_status = 'confirmed' order by id"""
EDGES_SQL = """
    select id, from_hallway_id, to_hallway_id, parent_type, parent_id, kind, path_points, review_status
    from hallway_edges where community_id = %s and space = 'raster' and review_status = 'confirmed' order by id"""
ATTACHMENTS_SQL = """
    select id, attachable_type, attachable_id, parent_type, parent_id, hallway_id, mode, anchor_x, anchor_y
    from hallway_attachments where community_id = %s order by id"""
STOPS_SQL = """
    select id, map_type, map_id, kind, name, building, floor, x_plot, y_plot, accessible, lock_provider, note, radius_px
    from wayfinding_stops where community_id = %s and status = 'active' order by id"""
UNITS_SQL = """
    select id, marketing_name, floor, building, floorplate_id, x_plot, y_plot, lock_provider, stop_description
    from units where community_id = %s and visible = true and (x_plot > 0 or y_plot > 0) order by id"""
AMENITIES_SQL = """
    select id, name, floor, building, amenityable_type, amenityable_id, x_plot, y_plot, lock_provider, directional_text
    from amenities where community_id = %s and amenityable_type in ('Floorplate', 'Sitemap') and (x_plot > 0 or y_plot > 0) order by id"""
DOORS_SQL = """
    select id, name, floor, x_plot, y_plot, lock_provider, attached_with_type, attached_with_id, sort, note, created_at
    from doors where community_id = %s order by id"""
ELEVATORS_SQL = """
    select id, name, x_plot, y_plot, directional_text, floorplate_id, sitemap_id, floorplate_covering_range, building, lock_provider, kind, accessible, floor_positions
    from elevators where community_id = %s order by id"""
BSPS_SQL = """
    select id, name, building, floor, x_plot, y_plot, lock_provider, directional_text
    from building_starting_points where community_id = %s order by id"""
MAIN_TOUR_SQL = """
    select id, name, x_plot, y_plot, starting_floor, building, building_order, tour_setup_version
    from tours where community_id = %s and tour_user_id is null order by id desc limit 1"""
TOUR_STOPS_SQL = """
    select id, stop_type, stop_id, name, sort, display_stop, duration_minutes
    from tour_stops where tour_id = %s order by sort asc nulls last, id asc"""
UNIT_BUILDINGS_SQL = "select building from units where community_id = %s order by id"
AMENITY_BUILDINGS_SQL = "select building from amenities where community_id = %s order by id"
BUCKET_HINT_SQL = """
    select url from (
      select 1 as o, id, standard_image_url as url from floorplates where community_id = %(id)s and coalesce(standard_image_url, '') <> ''
      union all select 2, id, standard_image_url from amenities where community_id = %(id)s and coalesce(standard_image_url, '') <> ''
      union all select 3, id, standard_image_url from units where community_id = %(id)s and coalesce(standard_image_url, '') <> ''
      union all select 4, id, standard_image_url from floorplans where community_id = %(id)s and coalesce(standard_image_url, '') <> ''
    ) s order by o, id limit 1"""


def load_rows(db: Database, community_id: int) -> WayfindingRows | None:
    with db.connection() as conn:
        community = conn.execute(COMMUNITY_SQL, (community_id,)).fetchone()
        if community is None:
            return None
        rows = WayfindingRows(community=community)
        rows.floorplates = conn.execute(FLOORPLATES_SQL, (community_id,)).fetchall()
        rows.sitemap = conn.execute(SITEMAP_SQL, (community_id,)).fetchone()
        rows.hallways = conn.execute(HALLWAYS_SQL, (community_id,)).fetchall()
        rows.hallway_edges = conn.execute(EDGES_SQL, (community_id,)).fetchall()
        rows.attachments = conn.execute(ATTACHMENTS_SQL, (community_id,)).fetchall()
        rows.stops = conn.execute(STOPS_SQL, (community_id,)).fetchall()
        rows.units = conn.execute(UNITS_SQL, (community_id,)).fetchall()
        rows.amenities = conn.execute(AMENITIES_SQL, (community_id,)).fetchall()
        rows.doors = conn.execute(DOORS_SQL, (community_id,)).fetchall()
        rows.elevators = conn.execute(ELEVATORS_SQL, (community_id,)).fetchall()
        rows.bsps = conn.execute(BSPS_SQL, (community_id,)).fetchall()
        rows.main_tour = conn.execute(MAIN_TOUR_SQL, (community_id,)).fetchone()
        if rows.main_tour:
            rows.tour_stops = conn.execute(TOUR_STOPS_SQL, (rows.main_tour["id"],)).fetchall()
        rows.unit_buildings = [r["building"] for r in conn.execute(UNIT_BUILDINGS_SQL, (community_id,)).fetchall()]
        rows.amenity_buildings = [r["building"] for r in conn.execute(AMENITY_BUILDINGS_SQL, (community_id,)).fetchall()]
        hint = conn.execute(BUCKET_HINT_SQL, {"id": community_id}).fetchone()
        rows.bucket_hint = hint["url"] if hint else None
        return rows
