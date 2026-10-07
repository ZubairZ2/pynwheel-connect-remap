"""URLs of the CarrierWave uploads a level shows, resolved the way the CMS
resolves them (`Connect::UploadUrl`, `S3Acceleration`):

- a level's main `image` is its `standard_image_url` (the S3 copy the CMS
  writes after every upload), served through S3 Transfer Acceleration;
- any other upload (the floor `svg_image`) lives under the CMS's upload
  path `uploads/<model>/<column>/<id>/<file>` on the property's bucket -
  the bucket the record's (or the property's) standard URLs name - or, with
  no S3 copy known, on the configured public uploads host.
"""
from __future__ import annotations

import re
from typing import Any

S3_BASE = re.compile(r"^https?://[^/]+\.amazonaws\.com(?=/uploads/)")
S3_HOST = re.compile(r"^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$")


def accelerated(url: str | None) -> str | None:
    """`S3Acceleration#convert_to_s3_accelerate_url`."""
    if not url:
        return url
    m = re.match(r"^(https?://)([^/]+)(.*)$", url)
    if not m:
        return url
    scheme, host, rest = m.groups()
    hm = S3_HOST.match(host)
    return f"{scheme}{hm.group(1)}.s3-accelerate.amazonaws.com{rest}" if hm else url


def s3_base(url: str | None) -> str | None:
    if not url:
        return None
    m = S3_BASE.match(url)
    return m.group(0) if m else None


def image_url(record: dict[str, Any], *, public_base: str, bucket_hint: str | None) -> str | None:
    if not record.get("image"):
        return None
    standard = record.get("standard_image_url")
    if standard:
        return accelerated(standard)
    return upload_url(record, "image", "floorplate" if "range" in record else "sitemap", public_base=public_base, bucket=bucket_hint)


def upload_url(record: dict[str, Any], column: str, model: str, *, public_base: str, bucket: str | None) -> str | None:
    file_name = record.get(column)
    if not file_name:
        return None
    path = f"/uploads/{model}/{column}/{record['id']}/{file_name}"
    base = s3_base(record.get("standard_image_url")) or bucket
    if base:
        return accelerated(f"{base}{path}")
    return f"{public_base.rstrip('/')}{path}" if public_base else path
