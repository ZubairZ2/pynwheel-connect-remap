"""Floor plan files the app cannot read for itself.

The CMS stores floor SVGs on S3 without CORS headers, so a web view can
draw them as an `<image>` but can never `fetch` them (which it must, to
send the API token and to learn the drawing's viewBox). This fetcher reads
the file server-side, checks it is an SVG document, and caches it: the
stored file names carry an upload timestamp, so a URL's content never
changes. Only `https://*.amazonaws.com` and the configured uploads host are
ever fetched.
"""
from __future__ import annotations

import hashlib
import logging
import re
import threading
import xml.etree.ElementTree as ET
from collections import OrderedDict
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

log = logging.getLogger("tour_api.assets")

MAX_SVG_BYTES = 24 * 1024 * 1024
CACHE_BYTES = 128 * 1024 * 1024
FETCH_TIMEOUT_S = 60.0


class AssetError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class SvgAsset:
    url: str
    content: bytes
    etag: str
    view_box: tuple[float, float, float, float] | None


_NUMBER = re.compile(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?")


def view_box_of(content: bytes) -> tuple[float, float, float, float] | None:
    """The root `<svg viewBox>`, else the box its width/height imply (as
    `Wayfinding::PlateTransform.view_box_of`). Raises AssetError when the
    document is not an SVG."""
    try:
        for event, element in ET.iterparse(_Bytes(content), events=("start",)):
            tag = element.tag.rsplit("}", 1)[-1]
            if tag != "svg":
                raise AssetError("invalid_svg", "The floor plan file is not an SVG document.")
            raw = element.attrib.get("viewBox")
            if raw:
                parts = [float(p) for p in re.split(r"[\s,]+", raw.strip()) if p]
                if len(parts) == 4 and parts[2] > 0 and parts[3] > 0:
                    return (parts[0], parts[1], parts[2], parts[3])
            w = _NUMBER.search(element.attrib.get("width", ""))
            h = _NUMBER.search(element.attrib.get("height", ""))
            if w and h and float(w.group(0)) > 0 and float(h.group(0)) > 0:
                return (0.0, 0.0, float(w.group(0)), float(h.group(0)))
            return None
    except ET.ParseError as exc:
        raise AssetError("invalid_svg", "The floor plan file is not valid SVG.") from exc
    raise AssetError("invalid_svg", "The floor plan file is empty.")


class _Bytes:
    """A minimal file-like over bytes for iterparse (reads in chunks)."""

    def __init__(self, data: bytes):
        self.data = data
        self.pos = 0

    def read(self, size: int = -1) -> bytes:
        if size is None or size < 0:
            chunk = self.data[self.pos :]
            self.pos = len(self.data)
            return chunk
        chunk = self.data[self.pos : self.pos + size]
        self.pos += len(chunk)
        return chunk


class AssetFetcher:
    def __init__(self, allowed_hosts: tuple[str, ...] = (), timeout_s: float = FETCH_TIMEOUT_S, transport: httpx.BaseTransport | None = None):
        self._client = httpx.Client(timeout=timeout_s, follow_redirects=True, transport=transport)
        self._allowed_hosts = allowed_hosts
        self._cache: OrderedDict[str, SvgAsset] = OrderedDict()
        self._size = 0
        self._lock = threading.Lock()

    def close(self) -> None:
        self._client.close()

    def allowed(self, url: str) -> bool:
        host = (urlparse(url).hostname or "").lower()
        if host.endswith(".amazonaws.com"):
            return True
        return any(host == h.lower() for h in self._allowed_hosts if h)

    def svg(self, url: str) -> SvgAsset:
        with self._lock:
            hit = self._cache.get(url)
            if hit:
                self._cache.move_to_end(url)
                return hit
        if not self.allowed(url):
            raise AssetError("svg_unavailable", "The floor plan is stored somewhere this service does not read from.")
        try:
            with self._client.stream("GET", url) as response:
                if response.status_code != 200:
                    log.warning("svg fetch %s -> %s", url, response.status_code)
                    raise AssetError("svg_unavailable", "The floor plan file could not be fetched.")
                chunks: list[bytes] = []
                total = 0
                for chunk in response.iter_bytes():
                    total += len(chunk)
                    if total > MAX_SVG_BYTES:
                        raise AssetError("svg_unavailable", "The floor plan file is too large to serve.")
                    chunks.append(chunk)
                content = b"".join(chunks)
        except httpx.HTTPError as exc:
            log.warning("svg fetch failed %s: %s", url, exc.__class__.__name__)
            raise AssetError("svg_unavailable", "The floor plan file could not be fetched.") from exc
        view_box = view_box_of(content)
        asset = SvgAsset(url=url, content=content, etag=hashlib.sha1(content).hexdigest()[:20], view_box=view_box)
        with self._lock:
            self._cache[url] = asset
            self._size += len(content)
            while self._size > CACHE_BYTES and len(self._cache) > 1:
                _, old = self._cache.popitem(last=False)
                self._size -= len(old.content)
        return asset
