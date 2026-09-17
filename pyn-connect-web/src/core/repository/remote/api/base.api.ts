import 'server-only';

import { railsURL } from '~/config/app/urls';

/**
 * The single network boundary (react-architecture.md §10, `base.api.ts`).
 *
 * Responsibilities, and nothing else:
 *  - prefix every path with the Rails base URL
 *  - force `Accept: application/json` (Devise treats `*​/*` as navigational and
 *    would answer a signed-out request with a 302 to the login page instead of
 *    a 401)
 *  - replay the Rails session cookie the sign-in route handler stored
 *  - never cache: these listings are per-user and permission-scoped
 */
export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  body: T | null;
  setCookie: string[];
  text: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  cookie?: string | null;
  body?: string;
  contentType?: string;
  accept?: string;
  parseJson?: boolean;
  redirect?: RequestRedirect;
}

export const apiRequest = async <T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    cookie,
    body,
    contentType,
    accept = 'application/json',
    parseJson = true,
    redirect = 'manual'
  } = options;

  const headers: Record<string, string> = { Accept: accept };
  if (contentType) headers['Content-Type'] = contentType;
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(railsURL(path), {
    method,
    headers,
    body,
    redirect,
    cache: 'no-store'
  });

  const text = await response.text();
  let parsed: T | null = null;

  if (parseJson && text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    body: parsed,
    setCookie: readSetCookies(response),
    text
  };
};

const readSetCookies = (response: Response): string[] => {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
};

/**
 * Appends query parameters, dropping the ones that carry no meaning upstream:
 * blanks, and the `all` sentinel the filter selects use for "no filter".
 */
export const withQuery = (
  path: string,
  params: Record<string, string | number | undefined | null>
): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;

    const asString = String(value).trim();
    if (asString === '' || asString === 'all') return;

    query.set(key, asString);
  });

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
};

/** Collapses `Set-Cookie` lines into a `Cookie` header value. */
export const mergeCookies = (existing: string | null, setCookies: string[]): string => {
  const jar = new Map<string, string>();

  (existing ?? '')
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const index = pair.indexOf('=');
      if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
    });

  setCookies.forEach((line) => {
    const [pair] = line.split(';');
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  });

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};
