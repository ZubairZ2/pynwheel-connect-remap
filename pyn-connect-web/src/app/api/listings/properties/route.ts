import { NextResponse } from 'next/server';

import { loadPropertiesListing } from '~/core/repository/remote/listings.server';
import { readRailsCookie } from '~/core/session/session.server';
import { propertiesParamsFromSearch } from '~/core/utils/generator/listingParams';

export const dynamic = 'force-dynamic';

/**
 * One page of the Properties listing for the state in the query string (the
 * same parameters the page reads from the URL). Same session, scope and
 * parsers as the server-rendered page. GET, read-only.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const load = await loadPropertiesListing(await readRailsCookie(), propertiesParamsFromSearch(new URL(request.url).searchParams));
  if (load.status !== 'found') return NextResponse.json({ ok: false, error: load.status }, { status: load.status === 'unauthorized' ? 401 : 502 });
  return NextResponse.json({ ok: true, listing: { rows: load.rows, meta: load.meta } }, { headers: { 'Cache-Control': 'private, no-store' } });
}
