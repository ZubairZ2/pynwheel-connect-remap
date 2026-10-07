from __future__ import annotations

from fastapi import APIRouter, Request, Response

from ...schemas.common import ERROR_RESPONSES
from ...schemas.map import GraphResponse, LevelDetailResponse, MapResponse
from ..deps import ContainerDep, TourPropertyDep

router = APIRouter(prefix="/properties/{property_id}", tags=["map"])

_RESPONSES = {k: v for k, v in ERROR_RESPONSES.items() if k in (401, 403, 404, 422)}


@router.get("/map", response_model=MapResponse, responses=_RESPONSES, summary="The property's map levels")
def property_map(container: ContainerDep, property_row: TourPropertyDep) -> MapResponse:
    """Buildings and levels (floorplates, or the site plan) with their image /
    SVG URLs, size, floors and coordinate frame. Small: load this first, then
    one level or the graph on demand."""
    return container.maps.map(property_row.id)


@router.get("/map/levels/{level_id}", response_model=LevelDetailResponse, responses=_RESPONSES, summary="One level with its plotted nodes and paths")
def level_detail(container: ContainerDep, property_row: TourPropertyDep, level_id: str) -> LevelDetailResponse:
    return container.maps.level(property_row.id, level_id)


@router.get(
    "/map/levels/{level_id}/svg",
    responses={**_RESPONSES, 200: {"content": {"image/svg+xml": {}}, "description": "The floor SVG document."}, 304: {"description": "Not modified."}, 502: {"description": "The stored file could not be fetched."}},
    summary="One level's floor SVG (served through the API)",
    response_class=Response,
)
def level_svg(container: ContainerDep, property_row: TourPropertyDep, level_id: str, request: Request) -> Response:
    """The CMS keeps floor SVGs on S3 without CORS headers, so the app reads
    them through this endpoint (same token, same access rules). The file is
    validated as an SVG document (422 `invalid_svg` otherwise), cached
    server-side (file names are immutable), and answered with an `ETag`."""
    asset = container.maps.svg(property_row.id, level_id)
    etag = f'"{asset.etag}"'
    headers = {"ETag": etag, "Cache-Control": "private, max-age=86400", "X-Svg-ViewBox": " ".join(f"{v:g}" for v in asset.view_box) if asset.view_box else ""}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(content=asset.content, media_type="image/svg+xml", headers=headers)


@router.get("/graph", response_model=GraphResponse, responses={**_RESPONSES, 304: {"description": "Not modified: the client's If-None-Match equals the current graph version."}}, summary="The routable graph")
def graph(container: ContainerDep, property_row: TourPropertyDep, request: Request, response: Response) -> GraphResponse | Response:
    """The persisted wayfinding graph as domain concepts: levels, nodes (with
    what their coordinates anchor), hallway paths with polylines, vertical
    connections, gates and the tour. The `version` is the ETag; send it back
    as `If-None-Match` to get a 304 while nothing changed."""
    version = container.engine.version(property_row.id)
    etag = f'"{version}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "private, max-age=0, must-revalidate"})
    payload = container.engine.payload(property_row.id, version=version)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, max-age=0, must-revalidate"
    return GraphResponse(**payload)
