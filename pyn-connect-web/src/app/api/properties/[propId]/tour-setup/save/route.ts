import { NextResponse } from 'next/server';

import { saveTourSetup } from '~/core/repository/remote/api/wayfinding.api';
import { connectWrite, propertyIdOf } from '~/core/repository/remote/connectWrite.server';

export const dynamic = 'force-dynamic';

/** Tour Setup's Save: stops added, removed, hidden, reordered and timed, elevators deleted — one transaction (`TourSetup::Save`). */
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

  return connectWrite(propertyId, (cookie, token) => saveTourSetup(cookie, propertyId, payload, token));
}
