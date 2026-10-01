import { NextResponse } from 'next/server';

import type { InventoryUnitListing } from '~/core/models/data/propertyInventory.data';
import { loadInventoryUnits } from '~/core/repository/remote/propertyInventory.server';
import { readRailsCookie } from '~/core/session/session.server';

export const dynamic = 'force-dynamic';

type InventoryUnitsResult =
  | { ok: true; listing: InventoryUnitListing }
  | { ok: false; error: 'unauthorized' | 'missing' | 'failed' };

const STATUS = { unauthorized: 401, missing: 404, failed: 502 } as const;

/**
 * The property's units listing (`UnitsController#index` as JSON, parsed), for
 * the Property Inventory screen, which reads it only once its Units tab or a
 * unit dialog opens. Same session, scope and parser as the server-rendered
 * inventory; components never call Rails directly. GET, read-only.
 */
export async function GET(_request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse<InventoryUnitsResult>> {
  const { propId } = await context.params;
  if (!/^\d+$/.test(propId)) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  const load = await loadInventoryUnits(await readRailsCookie(), Number(propId));
  if (load.status !== 'found') return NextResponse.json({ ok: false, error: load.status }, { status: STATUS[load.status] });

  return NextResponse.json({ ok: true, listing: load.listing }, { headers: { 'Cache-Control': 'private, no-store' } });
}
