import { NextResponse } from 'next/server';

import { setStopList } from '~/core/repository/remote/api/wayfinding.api';
import { connectWrite, propertyIdOf } from '~/core/repository/remote/connectWrite.server';

export const dynamic = 'force-dynamic';

/**
 * "Show in Stops List" on the unit and amenity forms: the one field those
 * forms persist from Connect (`TourStops::Membership`). Body:
 * `{ stopType: 'unit' | 'amenity', stopId, show }`.
 */
export async function PUT(request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse> {
  const { propId } = await context.params;
  const propertyId = propertyIdOf(propId);
  if (propertyId == null) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });

  let body: { stopType?: string; stopId?: number; show?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid', message: 'The payload is not JSON.' }, { status: 422 });
  }
  const stopType = body.stopType === 'unit' || body.stopType === 'amenity' ? body.stopType : null;
  const stopId = Number(body.stopId);
  if (!stopType || !Number.isInteger(stopId)) {
    return NextResponse.json({ ok: false, error: 'invalid', message: 'stopType must be unit or amenity and stopId an id.' }, { status: 422 });
  }

  return connectWrite(propertyId, (cookie, token) => setStopList(cookie, propertyId, { stop_type: stopType, stop_id: stopId, show: body.show === true }, token));
}
