import { NextResponse } from 'next/server';

import { fetchInventoryListing } from '~/core/repository/remote/api/inventory.api';
import { parseInventoryFloorplates, parseInventoryProperty } from '~/core/repository/parser/inventory.parser';
import { readRailsCookie } from '~/core/session/session.server';

export const dynamic = 'force-dynamic';

/** Longest we wait for the stored file; the CMS's floor SVGs run to a few MB. */
const FETCH_TIMEOUT_MS = 45_000;

/**
 * Why a plan could not be served, as the canvas reports it. `status` is the
 * storage's own HTTP status for `upstream`; `file` is the stored file name
 * (never its URL: a signed query string must not reach the page or a log).
 */
export type PlanSvgFailure = 'missing' | 'unauthorized' | 'listing' | 'upstream' | 'timeout' | 'network' | 'not-svg';

interface FailureBody {
  ok: false;
  error: PlanSvgFailure;
  status?: number;
  file?: string;
  host?: string;
}

const fail = (error: PlanSvgFailure, http: number, extra: Omit<FailureBody, 'ok' | 'error'> = {}): Response =>
  NextResponse.json({ ok: false, error, ...extra } satisfies FailureBody, { status: http });

/**
 * The file within FETCH_TIMEOUT_MS, headers and body together: a store that
 * answers at once but streams a few MB over minutes (seen from a slow link)
 * is a timeout the page can retry, not a request to wait out.
 */
const fetchWithTimeout = async (url: string): Promise<{ status: number; ok: boolean; text: string } | 'timeout'> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = response.ok ? await response.text() : '';
    return { status: response.status, ok: response.ok, text };
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') return 'timeout';
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

/** The host of a stored URL, for the diagnostic (the bucket name says which environment answered); nothing of its path or query. */
const hostOf = (url: string): string | undefined => {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
};

/** Whether the body is an SVG document: a storage bucket answers 200 with an XML error page for some refusals, and a stale key can name a raster. */
const looksLikeSvg = (text: string): boolean => /<svg[\s>]/i.test(text.slice(0, 4096)) || /<svg[\s>]/i.test(text);

/**
 * The floor SVG behind one level of the Map & Plotting canvas — or, with
 * `background=1`, the property's one shared background map (a Beans
 * property's `communities.background_svg_image`, which every floor SVG
 * overlays).
 *
 * The browser cannot read the stored file itself: it lives on S3 without CORS
 * headers for this origin, and an `<img>` of it hides its polygons. So this
 * handler resolves the file through the property's own floorplates listing
 * (`GET /communities/:id/floorplates.json`, scoped to the signed-in user by
 * Rails as every Connect read is) and streams the SVG text back. It reads the
 * one file the listing names for that level and nothing else; a level id
 * outside the property answers 404. Which copy of the file that is (the CMS
 * host's, or the S3 one when the CMS keeps files on disk and the database was
 * restored from another environment) is the listing's decision
 * (Connect::UploadUrl), not this handler's.
 *
 * A failure says what failed (`error`), so the canvas can tell a missing
 * upload from a refused bucket, a timeout or a file that is not an SVG, and
 * Retry asks the listing again — the CMS re-resolves the URL on every request.
 */
export async function GET(request: Request, context: { params: Promise<{ propId: string }> }): Promise<Response> {
  const { propId } = await context.params;
  if (!/^\d+$/.test(propId)) return fail('missing', 404);

  const params = new URL(request.url).searchParams;
  const plateId = params.get('floorplate');
  const sitemapId = params.get('sitemap');
  const background = params.get('background') === '1';
  if ((plateId && !/^\d+$/.test(plateId)) || (sitemapId && !/^\d+$/.test(sitemapId)) || (!plateId && !sitemapId && !background)) {
    return fail('missing', 404);
  }

  const listing = await fetchInventoryListing(await readRailsCookie(), Number(propId), 'floorplates');
  if (listing.status === 401) return fail('unauthorized', 401);
  if (listing.status === 302 || listing.status === 404) return fail('missing', 404);
  if (!listing.ok || listing.body == null) return fail('listing', 502, { status: listing.status });

  const property = parseInventoryProperty(listing.body);
  if (!property || property.id !== Number(propId)) return fail('listing', 502);

  const plates = parseInventoryFloorplates(listing.body);
  const upload = background
    ? plates.sharedBackground
    : plateId
      ? (plates.floorplates.find((plate) => plate.id === Number(plateId))?.svg ?? null)
      : plates.sitemap && plates.sitemap.id === Number(sitemapId)
        ? plates.sitemap.svg
        : null;
  if (!upload?.url) return fail('missing', 404);
  const file = upload.fileName || undefined;
  const host = hostOf(upload.url);

  let upstream: Awaited<ReturnType<typeof fetchWithTimeout>>;
  try {
    upstream = await fetchWithTimeout(upload.url);
  } catch {
    return fail('network', 502, { file, host });
  }
  if (upstream === 'timeout') return fail('timeout', 504, { file, host });
  if (!upstream.ok) return fail('upstream', 502, { status: upstream.status, file, host });

  const { text } = upstream;
  if (!looksLikeSvg(text)) return fail('not-svg', 502, { file, host });

  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // The file is per user (the listing is scoped) and rarely changes.
      'Cache-Control': 'private, max-age=600'
    }
  });
}
