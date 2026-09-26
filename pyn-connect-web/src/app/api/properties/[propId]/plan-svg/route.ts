import { NextResponse } from 'next/server';

import { fetchInventoryListing } from '~/core/repository/remote/api/inventory.api';
import { parseInventoryFloorplates, parseInventoryProperty } from '~/core/repository/parser/inventory.parser';
import { readRailsCookie } from '~/core/session/session.server';

export const dynamic = 'force-dynamic';

/** Longest we wait for the stored file; the CMS's floor SVGs run to a few MB. */
const FETCH_TIMEOUT_MS = 45_000;

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
};

/** The S3 bucket the property's floor images are served from (`https://<bucket>.s3….amazonaws.com`), from the first image URL that names one. */
const bucketOf = (urls: (string | null | undefined)[]): string | null => {
  for (const url of urls) {
    const match = /^(https:\/\/[^/]+\.amazonaws\.com)\/uploads\//.exec(url ?? '');
    if (match) return match[1];
  }
  return null;
};

/**
 * The floor SVG behind one level of the Map & Plotting canvas.
 *
 * The browser cannot read the stored file itself: it lives on S3 without CORS
 * headers for this origin, and an `<img>` of it hides its polygons. So this
 * handler resolves the file through the property's own floorplates listing
 * (`GET /communities/:id/floorplates.json`, scoped to the signed-in user by
 * Rails as every Connect read is) and streams the SVG text back. It reads the
 * one file the listing names for that level and nothing else; a level id
 * outside the property answers 404.
 */
export async function GET(request: Request, context: { params: Promise<{ propId: string }> }): Promise<Response> {
  const { propId } = await context.params;
  if (!/^\d+$/.test(propId)) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const plateId = params.get('floorplate');
  const sitemapId = params.get('sitemap');
  if ((plateId && !/^\d+$/.test(plateId)) || (sitemapId && !/^\d+$/.test(sitemapId)) || (!plateId && !sitemapId)) {
    return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });
  }

  const listing = await fetchInventoryListing(await readRailsCookie(), Number(propId), 'floorplates');
  if (listing.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (listing.status === 302 || listing.status === 404) {
    return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });
  }
  if (!listing.ok || listing.body == null) return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });

  const property = parseInventoryProperty(listing.body);
  if (!property || property.id !== Number(propId)) return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });

  const plates = parseInventoryFloorplates(listing.body);
  const level = plateId
    ? (plates.floorplates.find((plate) => plate.id === Number(plateId)) ?? null)
    : plates.sitemap && plates.sitemap.id === Number(sitemapId)
      ? plates.sitemap
      : null;
  const url = level?.svg?.url ?? null;
  if (!level || !url) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  try {
    let upstream = await fetchWithTimeout(url);
    // CarrierWave stores to disk in development but to S3 everywhere else, and
    // the CMS copies each floor image's S3 URL into `standard_image_url`. When
    // a database restored from staging names an SVG the CMS host does not hold
    // on disk, the same stored file sits on S3 next to that image
    // (`uploads/floorplate/svg_image/<id>/<file>`), so read it from there.
    if (upstream.status === 404) {
      const bucket = bucketOf([level.image?.url, ...plates.floorplates.map((plate) => plate.image?.url), plates.sitemap?.image?.url]);
      const bucketUrl = bucket ? `${bucket}/uploads/${plateId ? 'floorplate' : 'sitemap'}/svg_image/${level.id}/${encodeURIComponent(level.svg?.fileName ?? '')}` : null;
      if (bucketUrl && level.svg?.fileName) upstream = await fetchWithTimeout(bucketUrl);
    }
    if (!upstream.ok) return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        // The file is per user (the listing is scoped) and rarely changes.
        'Cache-Control': 'private, max-age=600'
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });
  }
}
