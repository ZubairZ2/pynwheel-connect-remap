from tests.conftest import TOUR_PROPERTY, Env


def stops(env: Env) -> dict:
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/stops", headers=env.auth())
    assert r.status_code == 200, r.text
    return r.json()


def test_stop_groups_and_membership(env: Env):
    body = stops(env)
    assert body["start_node"] == "tour_start:7"
    assert body["graph_version"] == "wf-100-test"
    groups = {g["key"]: g for g in body["groups"]}
    assert groups["amenities"]["label"] == "Amenities" and groups["floorplans"]["label"] == "Floorplans"
    amenity_ids = [s["id"] for s in groups["amenities"]["stops"]]
    unit_ids = [s["id"] for s in groups["floorplans"]["stops"]]
    assert amenity_ids == ["amenity:11"], "the Gym is on; the Pool's Show in Stops List is off"
    assert "unit:102" not in unit_ids, "display_stop false is excluded"
    assert unit_ids.count("unit:101") == 1, "duplicate tour_stops rows collapse to one stop"
    # Tour order: building order A then B; within A by floor then sort.
    assert unit_ids == ["unit:101", "unit:999", "unit:301", "unit:201"]
    assert body["total"] == 5


def test_stop_contract(env: Env):
    body = stops(env)
    unit = next(s for g in body["groups"] for s in g["stops"] if s["id"] == "unit:101")
    assert unit["type"] == "unit" and unit["record_id"] == 101 and unit["tour_stop_id"] == 1
    assert unit["name"] == "101"
    assert unit["instruction"] == "Turn left at the lobby"
    assert unit["building"] == "A" and unit["floor"] == 1
    assert unit["level_id"] == "floorplate:1" and unit["floorplate_id"] == 1
    assert unit["location"] == {"x": 320.0, "y": 60.0}
    assert unit["map_node_id"] == "unit:101" and unit["routable"] is True
    assert unit["duration_minutes"] == 4
    assert unit["unit"] == {"bedrooms": 2.0, "bathrooms": 2.0, "square_feet": 850.0, "rent": 2400.0, "available": True, "model": False, "floorplan_name": "A1"}
    assert unit["amenity"] is None
    gym = next(s for g in body["groups"] for s in g["stops"] if s["id"] == "amenity:11")
    assert gym["instruction"] == "Past the mailroom." and gym["description"] == "Open 6-10"
    assert gym["amenity"]["amenity_type"] == "Fitness"
    assert gym["routable"] is True


def test_unlinked_stop_is_not_routable(env: Env):
    body = stops(env)
    island = next(s for g in body["groups"] for s in g["stops"] if s["id"] == "unit:999")
    assert island["routable"] is False, "its nearest hallway is an island with no path"
    assert island["map_node_id"] == "unit:999"


def test_no_stops_when_no_tour(env: Env):
    rows = env.container.engine.rows_by_property[TOUR_PROPERTY]  # type: ignore[attr-defined]
    saved = rows.main_tour, rows.tour_stops
    rows.main_tour, rows.tour_stops = None, []
    env.container.engine.clear()
    try:
        body = stops(env)
        assert body["total"] == 0 and body["tour_id"] is None and body["start_node"] is None
    finally:
        rows.main_tour, rows.tour_stops = saved
        env.container.engine.clear()
