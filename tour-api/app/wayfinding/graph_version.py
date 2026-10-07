"""`Wayfinding::GraphVersion` ported: one version string per property that
moves whenever anything a route can depend on changes (the levels'
wayfinding_version counters, the main tour's tour_setup_version, and the
row count + latest updated_at of every table the graph is built from).

The string is the API's cache key and ETag. PAYLOAD_FORMAT is bumped when
the payload shape changes so no stale body or client ETag survives a deploy.
"""
from __future__ import annotations

import hashlib

from ..repositories.db import Database

PAYLOAD_FORMAT = 1

VERSION_SQL = """
with tour as (select id from tours where community_id = %(id)s and tour_user_id is null order by id desc limit 1)
select
  (select coalesce(sum(wayfinding_version), 0) from floorplates where community_id = %(id)s) as fp_version,
  (select coalesce(sum(wayfinding_version), 0) from sitemaps where community_id = %(id)s) as sm_version,
  (select coalesce(tour_setup_version, 0) from tours where id = (select id from tour)) as tour_version,
  (select count(*) from hallways where community_id = %(id)s) as c_hallways, (select max(updated_at) from hallways where community_id = %(id)s) as u_hallways,
  (select count(*) from hallway_edges where community_id = %(id)s) as c_edges, (select max(updated_at) from hallway_edges where community_id = %(id)s) as u_edges,
  (select count(*) from hallway_attachments where community_id = %(id)s) as c_att, (select max(updated_at) from hallway_attachments where community_id = %(id)s) as u_att,
  (select count(*) from wayfinding_stops where community_id = %(id)s) as c_stops, (select max(updated_at) from wayfinding_stops where community_id = %(id)s) as u_stops,
  (select count(*) from elevators where community_id = %(id)s) as c_elev, (select max(updated_at) from elevators where community_id = %(id)s) as u_elev,
  (select count(*) from building_starting_points where community_id = %(id)s) as c_bsp, (select max(updated_at) from building_starting_points where community_id = %(id)s) as u_bsp,
  (select count(*) from doors where community_id = %(id)s) as c_doors, (select max(updated_at) from doors where community_id = %(id)s) as u_doors,
  (select count(*) from units where community_id = %(id)s) as c_units, (select max(updated_at) from units where community_id = %(id)s) as u_units,
  (select count(*) from amenities where community_id = %(id)s) as c_amen, (select max(updated_at) from amenities where community_id = %(id)s) as u_amen,
  (select count(*) from tour_stops where tour_id = (select id from tour)) as c_ts, (select max(updated_at) from tour_stops where tour_id = (select id from tour)) as u_ts,
  (select string_agg(id::text, '.' order by id) from (select id from floorplates where community_id = %(id)s union all select id from sitemaps where community_id = %(id)s) l) as level_ids
"""


def graph_version(db: Database, community_id: int) -> str:
    row = db.fetch_one(VERSION_SQL, {"id": community_id}) or {}
    parts: list[str] = [str(row.get("fp_version", 0)), str(row.get("sm_version", 0)), str(row.get("tour_version") or 0)]
    for key in ("hallways", "edges", "att", "stops", "elev", "bsp", "doors", "units", "amen", "ts"):
        parts.append(str(row.get(f"c_{key}", 0)))
        stamp = row.get(f"u_{key}")
        parts.append("" if stamp is None else f"{stamp.timestamp():.3f}")
    parts.append(row.get("level_ids") or "")
    parts.append(str(PAYLOAD_FORMAT))
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"wf-{community_id}-{digest}"
