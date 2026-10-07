import { NextResponse } from 'next/server';

import { saveWayfindingGraph } from '~/core/repository/remote/api/wayfinding.api';
import { connectWrite, propertyIdOf } from '~/core/repository/remote/connectWrite.server';

export const dynamic = 'force-dynamic';

/**
 * Map & Plotting's Save: one level's wayfinding changes (points, paths,
 * bridges, pins, additional stops) as `Wayfinding::GraphSave` takes them,
 * applied by Rails in one transaction. The body is the payload
 * `graphDiff.ts` built; the answer is the write outcome (200, or 409 stale /
 * 422 invalid / 403 / 404 / 401). Components never call Rails directly.
 */
export async function PUT(request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse> {
  const { propId } = await context.params;
  const propertyId = propertyIdOf(propId);
  if (propertyId == null) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid', message: 'The save payload is not JSON.' }, { status: 422 });
  }

  return connectWrite(propertyId, (cookie, token) => saveWayfindingGraph(cookie, propertyId, payload, token));
}
