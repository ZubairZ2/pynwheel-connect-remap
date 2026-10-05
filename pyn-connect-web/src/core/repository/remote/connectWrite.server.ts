import 'server-only';

import { NextResponse } from 'next/server';

import { CORE_URLS } from '~/config/app/urls';
import { SESSION_COOKIE, readRailsCookie, sessionCookieOptions } from '~/core/session/session.server';
import { apiRequest, mergeCookies, type ApiResponse } from './api/base.api';

/**
 * The one way a Connect route handler writes to the CMS.
 *
 * Rails verifies the authenticity token of every Connect write against the
 * session it decrypts from the cookie this server replays. The token has to
 * come from that very session, so each write first makes one small read
 * (the floorplates listing, whose meta carries `csrf_token`), keeps the
 * session cookie that read answered with (with the cookie session store of
 * development the token lives inside it), and sends the PUT with the pair.
 * The merged cookie is then stored back in the browser, so the session the
 * next request replays is the one the token belongs to.
 *
 * Statuses are mapped once here: the browser only ever sees `WriteOutcome`.
 */
export type WriteError = 'unauthorized' | 'forbidden' | 'csrf' | 'disabled' | 'missing' | 'stale' | 'invalid' | 'failed';

export interface WriteFailure {
  ok: false;
  error: WriteError;
  message: string | null;
  /** 422: the per-item errors Rails answered (`{path, code, message}`). */
  errors?: { path?: string; code?: string; message?: string }[];
  /** 409: the versions the client should rebase on. */
  currentVersion?: number | null;
  changedBy?: string | null;
  data?: unknown;
}

export type WriteOutcome<T> = { ok: true; data: T; meta: Record<string, unknown> } | WriteFailure;

interface Envelope {
  data?: unknown;
  meta?: Record<string, unknown>;
  errors?: { path?: string; code?: string; message?: string; current_version?: number; changed_by?: string | null }[];
  error?: string;
}

/** The authenticity token of this session, with the session cookie it belongs to. */
export const freshCsrf = async (cookie: string | null, propertyId: number): Promise<{ token: string | null; cookie: string | null; status: number }> => {
  const read = await apiRequest<Envelope>(CORE_URLS.inventory.floorplates(propertyId), { cookie });
  const token = (read.body?.meta?.csrf_token as string | undefined) ?? null;
  return { token, cookie: cookie ? mergeCookies(cookie, read.setCookie) : cookie, status: read.status };
};

const failure = (error: WriteError, message: string | null = null, extra: Partial<WriteFailure> = {}): WriteFailure => ({ ok: false, error, message, ...extra });

const STATUS: Record<WriteError, number> = { unauthorized: 401, forbidden: 403, csrf: 403, disabled: 404, missing: 404, stale: 409, invalid: 422, failed: 502 };

/** Maps a Connect write's response to the outcome the browser gets. */
export const outcomeOf = <T>(response: ApiResponse<Envelope>): WriteOutcome<T> => {
  const body = response.body ?? {};
  const first = body.errors?.[0];
  if (response.status === 401) return failure('unauthorized');
  if (response.status === 403) return failure(first?.code === 'csrf' ? 'csrf' : 'forbidden', first?.message ?? null);
  if (response.status === 404) return failure(first?.code === 'disabled' ? 'disabled' : 'missing', first?.message ?? null);
  if (response.status === 409) return failure('stale', first?.message ?? null, { currentVersion: first?.current_version ?? null, changedBy: first?.changed_by ?? null, data: body.data });
  if (response.status === 422) return failure('invalid', first?.message ?? null, { errors: body.errors ?? [] });
  if (!response.ok) return failure('failed', first?.message ?? body.error ?? null);
  return { ok: true, data: body.data as T, meta: body.meta ?? {} };
};

/**
 * Runs one write with a fresh token (and once more with a newer one when
 * Rails still answers `csrf`), answering the browser's response with the
 * outcome and the session cookie the token came from.
 */
export const connectWrite = async <T>(
  propertyId: number,
  write: (cookie: string | null, csrfToken: string | null) => Promise<ApiResponse>
): Promise<NextResponse<WriteOutcome<T>>> => {
  const stored = await readRailsCookie();
  if (!stored) return NextResponse.json(failure('unauthorized'), { status: 401 });

  let session = await freshCsrf(stored, propertyId);
  if (session.status === 401) return NextResponse.json(failure('unauthorized'), { status: 401 });

  let response = await write(session.cookie, session.token);
  let outcome = outcomeOf<T>(response as ApiResponse<Envelope>);
  if (!outcome.ok && outcome.error === 'csrf') {
    session = await freshCsrf(mergeCookies(session.cookie, response.setCookie), propertyId);
    response = await write(session.cookie, session.token);
    outcome = outcomeOf<T>(response as ApiResponse<Envelope>);
  }

  const next = NextResponse.json(outcome, { status: outcome.ok ? 200 : STATUS[outcome.error], headers: { 'Cache-Control': 'private, no-store' } });
  const latest = mergeCookies(session.cookie, response.setCookie);
  if (latest && latest !== stored) next.cookies.set(SESSION_COOKIE, latest, sessionCookieOptions);
  return next;
};

export const propertyIdOf = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null);
