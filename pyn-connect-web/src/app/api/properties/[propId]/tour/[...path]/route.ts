import { NextResponse } from 'next/server';

import type { TourModuleMeta, TourResult } from '~/core/models/data/tourModules.data';
import { fetchTourModule, fetchTourModuleText, writeTourModule } from '~/core/repository/remote/api/tourModules.api';
import { connectWrite, propertyIdOf, type WriteOutcome } from '~/core/repository/remote/connectWrite.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';

export const dynamic = 'force-dynamic';

/**
 * The Tour Setup modules' gateway: `GET /api/properties/:id/tour/<path>`
 * reads a module path, `POST` writes it. Only the paths below exist; a
 * write names the Rails verb it becomes, so the browser never chooses one.
 * Reads pass their query string through (filters, pages, dates); the CSV
 * export streams back as a download. Every answer is `{ok, data, meta}`
 * with the data camelCased, or `{ok: false, error, message, errors}` with
 * the write's outcome (connectWrite.server).
 */
type Verb = 'POST' | 'PUT' | 'DELETE';

const READS: RegExp[] = [/^locks$/, /^locks\/auto_match$/, /^stops$/, /^visitors$/, /^visitors\/\d+$/, /^booking$/, /^booking\/availability$/, /^tour\/publication$/];
const CSV: RegExp[] = [/^visitors\/export$/];
const WRITES: [RegExp, Verb, (path: string) => string][] = [
  [/^locks\/(map|unmap|manual_code|enabled|account|instructions|instruction_image|disconnect)$/, 'PUT', (path) => path],
  [/^locks\/account\/remove_authorization$/, 'PUT', (path) => path],
  [/^locks\/auto_match$/, 'POST', (path) => path],
  [/^locks\/(sync|test|devices|import_csv)$/, 'POST', (path) => path],
  [/^locks\/purge$/, 'DELETE', (path) => path],
  [/^stops\/\d+$/, 'PUT', (path) => path],
  [/^visitors\/bookings$/, 'POST', (path) => path],
  [/^visitors\/bookings\/\d+\/reschedule$/, 'PUT', (path) => path],
  [/^visitors\/bookings\/\d+\/cancel$/, 'DELETE', (path) => path.replace(/\/cancel$/, '')],
  [/^visitors\/\d+\/reset_stops$/, 'POST', (path) => path],
  [/^visitors\/\d+\/(id_review|reset_verification|remove_pii)$/, 'PUT', (path) => path],
  [/^visitors\/\d+\/delete$/, 'DELETE', (path) => path.replace(/\/delete$/, '')],
  [/^booking\/(rules|hours|form|closures)$/, 'PUT', (path) => path],
  [/^tour\/publish$/, 'POST', (path) => path]
];

const metaOf = (meta: Record<string, unknown> | undefined): TourModuleMeta => {
  const source = (meta ?? {}) as Record<string, unknown>;
  const property = (source.property ?? {}) as Record<string, unknown>;
  return {
    writesEnabled: source.writes_enabled === true,
    canEdit: source.can_edit === true,
    isSuperAdmin: source.is_super_admin === true,
    timeZone: (property.time_zone as string | undefined) ?? (source.time_zone as string | undefined) ?? null,
    propertyName: (property.name as string | undefined) ?? null
  };
};

const pathOf = (segments: string[]): string => segments.map((segment) => segment.replace(/[^a-z0-9_]/gi, '')).join('/');

export async function GET(request: Request, context: { params: Promise<{ propId: string; path: string[] }> }): Promise<NextResponse> {
  const { propId, path: segments } = await context.params;
  const propertyId = propertyIdOf(propId);
  const path = pathOf(segments);
  if (propertyId == null) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });
  const query = new URL(request.url).search.replace(/^\?/, '');
  const cookie = await readRailsCookie();
  if (!cookie) return NextResponse.json({ ok: false, error: 'unauthorized', message: null }, { status: 401 });

  if (CSV.some((pattern) => pattern.test(path))) {
    const response = await fetchTourModuleText(cookie, propertyId, path, query);
    if (response.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized', message: null }, { status: 401 });
    if (!response.ok) return NextResponse.json({ ok: false, error: response.status === 404 ? 'missing' : 'failed', message: null }, { status: response.status === 404 ? 404 : 502 });
    return new NextResponse(response.text, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="visitors-${propertyId}.csv"`, 'Cache-Control': 'private, no-store' }
    });
  }
  if (!READS.some((pattern) => pattern.test(path))) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });

  const response = await fetchTourModule(cookie, propertyId, path, query);
  const body = (response.body ?? {}) as { data?: unknown; meta?: Record<string, unknown>; errors?: { code?: string; message?: string }[] };
  if (response.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized', message: null }, { status: 401 });
  if (response.status === 302 || response.status === 404) return NextResponse.json({ ok: false, error: 'missing', message: body.errors?.[0]?.message ?? null }, { status: 404 });
  if (!response.ok || body.data == null) return NextResponse.json({ ok: false, error: 'failed', message: body.errors?.[0]?.message ?? null }, { status: 502 });

  const result: TourResult<unknown> = { ok: true, data: ModelDataConverter.toCamelCase(body.data), meta: metaOf(body.meta) };
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, context: { params: Promise<{ propId: string; path: string[] }> }): Promise<NextResponse> {
  const { propId, path: segments } = await context.params;
  const propertyId = propertyIdOf(propId);
  const path = pathOf(segments);
  if (propertyId == null) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });
  const write = WRITES.find(([pattern]) => pattern.test(path));
  if (!write) return NextResponse.json({ ok: false, error: 'missing', message: null }, { status: 404 });

  let payload: unknown = {};
  try {
    const text = await request.text();
    payload = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid', message: 'The payload is not JSON.' }, { status: 422 });
  }
  const [, verb, railsPath] = write;
  const outcome = await connectWrite<unknown>(propertyId, (cookie, token) => writeTourModule(cookie, propertyId, verb, railsPath(path), payload, token));
  const body = (await outcome.json()) as WriteOutcome<unknown>;
  if (!body.ok) {
    const errors = body.errors ?? [];
    return NextResponse.json({ ok: false, error: body.error, message: body.message, errors: ModelDataConverter.toCamelCase(errors), code: errors[0]?.code ?? null }, { status: outcome.status, headers: outcome.headers });
  }
  const result: TourResult<unknown> = { ok: true, data: ModelDataConverter.toCamelCase(body.data), meta: metaOf(body.meta) };
  return NextResponse.json(result, { status: 200, headers: outcome.headers });
}
