"""Floor SVG delivery and the level metadata the app needs to place it."""
from app.integrations.assets import AssetError, view_box_of
from app.repositories.rubyisms import strip_html
from tests.conftest import TOUR_PROPERTY, Env


def test_map_levels_carry_svg_path_and_calibration(env: Env):
    body = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map", headers=env.auth()).json()
    by_id = {l["id"]: l for l in body["levels"]}
    assert by_id["floorplate:1"]["svg_path"] is None and by_id["floorplate:1"]["svg_transform"] is None
    assert by_id["floorplate:2"]["svg_path"] == f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2/svg"
    assert by_id["floorplate:2"]["svg"].endswith("/uploads/floorplate/svg_image/2/b.svg")
    assert by_id["floorplate:3"]["svg_size"] == {"width": 2000, "height": 2000}
    assert by_id["floorplate:3"]["width"] is None, "an SVG-only plate has no raster frame; the app uses the viewBox"
    level = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2", headers=env.auth()).json()
    assert level["level"]["svg_path"] == by_id["floorplate:2"]["svg_path"]


def test_svg_is_served_validated_and_cached(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2/svg", headers=env.auth())
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert r.headers["ETag"] == '"etag-b"'
    assert r.headers["X-Svg-ViewBox"] == "0 0 1412 912"
    assert r.content.startswith(b"<?xml") and b"<svg" in r.content
    r2 = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2/svg", headers={**env.auth(), "If-None-Match": '"etag-b"'})
    assert r2.status_code == 304


def test_svg_errors(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:1/svg", headers=env.auth())
    assert r.status_code == 404 and r.json()["error"]["code"] == "no_svg"
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:3/svg", headers=env.auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_svg"
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:99/svg", headers=env.auth())
    assert r.status_code == 404 and r.json()["error"]["code"] == "unknown_level"
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2/svg")
    assert r.status_code == 401


def test_view_box_parsing():
    assert view_box_of(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1412.16 912.24"/>') == (0.0, 0.0, 1412.16, 912.24)
    assert view_box_of(b'<svg xmlns="http://www.w3.org/2000/svg" width="800px" height="600px"/>') == (0.0, 0.0, 800.0, 600.0)
    assert view_box_of(b'<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/"> ]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000"><g/></svg>') == (0.0, 0.0, 2000.0, 2000.0)
    for bad in (b"<html><body>no</body></html>", b"<svg", b"", b"PNG\x89"):
        try:
            view_box_of(bad)
        except AssetError as exc:
            assert exc.code == "invalid_svg"
        else:
            raise AssertionError(f"accepted {bad!r}")


def test_instructions_are_plain_text(env: Env):
    stops = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/stops", headers=env.auth()).json()
    gym = next(s for g in stops["groups"] for s in g["stops"] if s["id"] == "amenity:11")
    assert gym["instruction"] == "Past the mailroom."
    route = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/route", json={"from_stop_id": "tour_start:7", "to_stop_id": "amenity:11"}, headers=env.auth()).json()
    assert route["route"]["steps"][-1]["instruction"] == "Past the mailroom."
    assert strip_html('Floor 1 &amp; <b>2</b><br/>done') == "Floor 1 & 2 done"
