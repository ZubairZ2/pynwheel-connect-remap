"""The Self-Guided Tour's stops list, read-only.

The authoritative rule is `TourStops::Membership.in_list?` in the CMS: a
unit or amenity is on the stops list when the property's main tour (the
`tours` row with `tour_user_id IS NULL`, latest id) has a `tour_stops` row
for it with `display_stop` on - and, for an amenity, its
`breezway_lock_visible` flag (the amenity form's "Show in Stops List") is
not off. Nothing is inferred from plotting.
"""
from __future__ import annotations

from typing import Any

from .db import Database

MAIN_TOUR_SQL = "select id from tours where community_id = %s and tour_user_id is null order by id desc limit 1"

UNIT_STOPS_SQL = """
    select distinct on (u.id)
      ts.id as tour_stop_id, ts.sort, ts.duration_minutes, ts.name as stop_name,
      u.id, u.marketing_name, u.floor, u.building, u.floorplate_id, u.x_plot, u.y_plot,
      u.square_feet, u.description, u.stop_description, u.available, u.modal_unit,
      u.effective_rent, u.market_rent,
      f.name as floorplan_name, f.bedrooms as floorplan_bedrooms, f.bathrooms as floorplan_bathrooms, f.square_feet as floorplan_square_feet
    from tour_stops ts
    join units u on u.id = ts.stop_id and u.community_id = %(community_id)s
    left join floorplans f on f.community_id = u.community_id and f.provider_floorplan_id = u.floorplan_id
    where ts.tour_id = %(tour_id)s and ts.stop_type = 'unit' and ts.display_stop is distinct from false
    order by u.id, ts.id"""

AMENITY_STOPS_SQL = """
    select distinct on (a.id)
      ts.id as tour_stop_id, ts.sort, ts.duration_minutes, ts.name as stop_name,
      a.id, a.name, a.floor, a.building, a.amenityable_type, a.amenityable_id, a.x_plot, a.y_plot,
      a.description, a.directional_text, a.amenity_type, a.video_link, a.video_link_button_label, a.breezway_lock_visible
    from tour_stops ts
    join amenities a on a.id = ts.stop_id and a.community_id = %(community_id)s
    where ts.tour_id = %(tour_id)s and ts.stop_type = 'amenity' and ts.display_stop is distinct from false
      and a.breezway_lock_visible is distinct from false
    order by a.id, ts.id"""


class StopsRepository:
    def __init__(self, db: Database):
        self.db = db

    def main_tour_id(self, community_id: int) -> int | None:
        row = self.db.fetch_one(MAIN_TOUR_SQL, (community_id,))
        return row["id"] if row else None

    def unit_stops(self, community_id: int, tour_id: int) -> list[dict[str, Any]]:
        return self.db.fetch_all(UNIT_STOPS_SQL, {"community_id": community_id, "tour_id": tour_id})

    def amenity_stops(self, community_id: int, tour_id: int) -> list[dict[str, Any]]:
        return self.db.fetch_all(AMENITY_STOPS_SQL, {"community_id": community_id, "tour_id": tour_id})
