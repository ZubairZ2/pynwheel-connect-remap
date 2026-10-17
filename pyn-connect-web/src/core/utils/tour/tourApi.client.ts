import { APP_API } from '~/config/app/urls';
import type { TourFieldError, TourResult, TourWriteError } from '~/core/models/data/tourModules.data';

/**
 * The browser side of the Tour Setup modules: reads and writes go to this
 * app's route handler (`APP_API.tourModule`), never to Rails. A write's
 * failure is already the `WriteOutcome` vocabulary of the other Connect
 * saves (unauthorized / forbidden / csrf / disabled / missing / stale /
 * invalid / failed) plus the Rails error code and per-field errors.
 */
const failure = (error: TourWriteError, message: string | null = null): TourResult<never> => ({ ok: false, error, message });

const parse = async <T>(response: Response): Promise<TourResult<T>> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(response.status === 401 ? 'unauthorized' : 'failed');
  }
  const parsed = body as TourResult<T>;
  if (parsed && typeof parsed === 'object' && 'ok' in parsed) return parsed;
  return failure('failed');
};

export const tourGet = async <T>(propertyId: number, path: string, query?: Record<string, string | number | undefined | null>): Promise<TourResult<T>> => {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value != null && String(value) !== '') params.set(key, String(value));
  });
  const serialized = params.toString();
  try {
    const response = await fetch(APP_API.tourModule(propertyId, path, serialized || undefined), { headers: { Accept: 'application/json' }, cache: 'no-store' });
    return await parse<T>(response);
  } catch {
    return failure('failed');
  }
};

export const tourPost = async <T>(propertyId: number, path: string, payload: unknown = {}): Promise<TourResult<T>> => {
  try {
    const response = await fetch(APP_API.tourModule(propertyId, path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload ?? {}),
      cache: 'no-store'
    });
    return await parse<T>(response);
  } catch {
    return failure('failed');
  }
};

/** The CSV export: the download URL the browser opens. */
export const tourExportUrl = (propertyId: number, query: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const serialized = params.toString();
  return APP_API.tourModule(propertyId, 'visitors/export', serialized || undefined);
};

/** The first field error's text, for a toast. */
export const firstFieldError = (errors: TourFieldError[] | undefined): string | null => {
  const first = errors?.[0];
  if (!first) return null;
  return first.path ? `${first.path}: ${first.message ?? first.code ?? ''}`.trim() : (first.message ?? first.code ?? null);
};
