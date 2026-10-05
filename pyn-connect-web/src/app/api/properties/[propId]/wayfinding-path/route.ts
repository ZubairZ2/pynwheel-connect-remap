import { NextResponse } from 'next/server';

import { fetchWayfindingPath } from '~/core/repository/remote/api/wayfinding.api';
import { propertyIdOf } from '~/core/repository/remote/connectWrite.server';
import { readRailsCookie } from '~/core/session/session.server';

export const dynamic = 'force-dynamic';

/**
 * A route between two places on the saved graph, from the same service the
 * Tour App reads (`Wayfinding::RouteService`), so the screen's "as saved"
 * preview equals the app. Query: `from`, `to` (typed ids such as `unit:5541`,
 * `elevator:7`, `stop:9`), `step_free`, optional `from_floor` / `to_floor`.
 * GET, read-only; a 422 carries the route error taxonomy.
 */
export async function GET(request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse> {
  const { propId } = await context.params;
  const propertyId = propertyIdOf(propId);
  if (propertyId == null) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const from = params.get('from')?.trim() ?? '';
  const to = params.get('to')?.trim() ?? '';
  if (!from || !to) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 422 });
  const floor = (key: string) => (params.get(key) && /^-?\d+$/.test(params.get(key)!) ? Number(params.get(key)) : null);

  const response = await fetchWayfindingPath(await readRailsCookie(), propertyId, {
    from,
    to,
    stepFree: params.get('step_free') === '1',
    fromFloor: floor('from_floor'),
    toFloor: floor('to_floor')
  });
  if (response.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (response.status === 302 || response.status === 404) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });
  const data = (response.body as { data?: unknown } | null)?.data ?? null;
  if (data == null) return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 });

  return NextResponse.json({ ok: response.ok, route: data }, { status: response.ok ? 200 : 422, headers: { 'Cache-Control': 'private, no-store' } });
}
