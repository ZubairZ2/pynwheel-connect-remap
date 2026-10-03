import { NextResponse } from 'next/server';

import type { InventoryUnitListing } from '~/core/models/data/propertyInventory.data';
import type { UnitListingRequest } from '~/core/repository/remote/api/inventory.api';
import { loadInventoryUnitsPage } from '~/core/repository/remote/propertyInventory.server';
import { readRailsCookie } from '~/core/session/session.server';
import { clampPageSize } from '~/core/utils/generator/pagination.generator';

export const dynamic = 'force-dynamic';

type InventoryUnitsResult =
  | { ok: true; listing: InventoryUnitListing }
  | { ok: false; error: 'unauthorized' | 'missing' | 'failed' };

const STATUS = { unauthorized: 401, missing: 404, failed: 502 } as const;

const LIST_KEYS = ['floorplan', 'availability', 'building', 'state', 'beds', 'baths', 'floor'] as const;
const TEXT_KEYS = { q: 'q', min_price: 'minPrice', max_price: 'maxPrice', min_sqft: 'minSqft', max_sqft: 'maxSqft' } as const;

/** The toolbar's request, read off the query string: only the parameters the listing knows, lists as comma-separated values. */
const requestOf = (url: URL): UnitListingRequest => {
  const params = url.searchParams;
  const request: UnitListingRequest = {
    page: Math.max(1, Number(params.get('page')) || 1),
    perPage: clampPageSize(params.get('per_page')),
    today: /^\d{4}-\d{2}-\d{2}$/.test(params.get('today') ?? '') ? params.get('today')! : undefined
  };
  LIST_KEYS.forEach((key) => {
    const values = (params.get(key) ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (values.length) request[key] = values;
  });
  (Object.keys(TEXT_KEYS) as (keyof typeof TEXT_KEYS)[]).forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) request[TEXT_KEYS[key]] = value;
  });
  return request;
};

/**
 * One page of the property's units listing (`UnitsController#index` as JSON
 * with a `page`, parsed), for the Property Inventory's Units tab: the page it
 * is on, the rows per page, and its toolbar's search and filters travel as
 * query parameters, and only that page comes back. Same session, scope and
 * parser as the server-rendered inventory; components never call Rails
 * directly. GET, read-only.
 */
export async function GET(request: Request, context: { params: Promise<{ propId: string }> }): Promise<NextResponse<InventoryUnitsResult>> {
  const { propId } = await context.params;
  if (!/^\d+$/.test(propId)) return NextResponse.json({ ok: false, error: 'missing' }, { status: 404 });

  const load = await loadInventoryUnitsPage(await readRailsCookie(), Number(propId), requestOf(new URL(request.url)));
  if (load.status !== 'found') return NextResponse.json({ ok: false, error: load.status }, { status: STATUS[load.status] });

  return NextResponse.json({ ok: true, listing: load.listing }, { headers: { 'Cache-Control': 'private, no-store' } });
}
