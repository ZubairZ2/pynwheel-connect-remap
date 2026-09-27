import { NextResponse } from 'next/server';

import { fetchWayfindingRoute } from '~/core/repository/remote/api/wayfinding.api';
import { parseWayfindingRoute } from '~/core/repository/parser/wayfinding.parser';
import { readRailsCookie } from '~/core/session/session.server';
import type { WayfindingRoute } from '~/core/models/data/propertyMap.data';

export const dynamic = 'force-dynamic';

type RouteResult = { ok: true; route: WayfindingRoute } | { ok: false; error: 'unauthorized' | 'missing' | 'failed' };

/**
 * "Run Algorithm" on the Map & Plotting screen: asks the CMS to compute the
 * property's tour route (`AutomatePlottingController#shortest_path`, a GET
 * that persists nothing) with the signed-in user's Rails session, and hands
 * the parsed legs back to the browser. Components never call Rails directly.
 */
export async function GET(request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse<RouteResult>> {
  const { propId } = await context.params;
  if (!/^\d+$/.test(propId)) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  const pathType = new URL(request.url).searchParams.get('path_type') === 'actual shortest' ? 'actual shortest' : 'sorting';
  const response = await fetchWayfindingRoute(await readRailsCookie(), Number(propId), pathType);

  if (response.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (response.status === 302 || response.status === 404) {
    return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });
  }

  const route = response.ok ? parseWayfindingRoute(response.body) : null;
  if (!route) return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });

  return NextResponse.json({ ok: true, route });
}
