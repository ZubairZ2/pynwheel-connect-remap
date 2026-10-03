import { NextResponse } from 'next/server';

import { loadCompaniesListing } from '~/core/repository/remote/listings.server';
import { readRailsCookie } from '~/core/session/session.server';
import { companiesParamsFromSearch } from '~/core/utils/generator/listingParams';

export const dynamic = 'force-dynamic';

/**
 * One page of the Companies listing for the state in the query string (the
 * same parameters the page reads from the URL), for the listing's search,
 * filters, sort and paging in the browser. Same session, scope and parsers
 * as the server-rendered page; components never call Rails directly. GET,
 * read-only.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const load = await loadCompaniesListing(await readRailsCookie(), companiesParamsFromSearch(new URL(request.url).searchParams));
  if (load.status !== 'found') return NextResponse.json({ ok: false, error: load.status }, { status: load.status === 'unauthorized' ? 401 : 502 });
  return NextResponse.json({ ok: true, listing: { rows: load.rows, meta: load.meta } }, { headers: { 'Cache-Control': 'private, no-store' } });
}
