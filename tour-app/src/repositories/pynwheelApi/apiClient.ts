/**
 * The one HTTP client of the app. Every request goes through `request()`:
 * bearer token, JSON, a timeout, and one error type (`ApiError`) with the
 * API's own error code so screens can show the real reason. A 401 tells
 * the session store the token is gone (expired / revoked) so the app can
 * return to sign-in instead of failing quietly.
 */

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'malformed_response'
  | 'unauthorized'
  | 'invalid_token'
  | 'token_expired'
  | 'token_revoked'
  | 'invalid_credentials'
  | 'not_super_admin'
  | 'inactive_user'
  | 'forbidden'
  | 'not_found'
  | 'tour_disabled'
  | 'invalid_stop'
  | 'validation_error'
  | 'upstream_unavailable'
  | 'internal_error'
  | string;

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuth(): boolean {
    return this.status === 401;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs: number;
  getToken: () => string | null;
  /** Runs before every authenticated request (the repository restores a persisted session here when its memory is empty). */
  beforeRequest?: () => Promise<void>;
  onUnauthorized: (error: ApiError) => void;
  fetchImpl?: typeof fetch;
}

const FRIENDLY: Record<string, string> = {
  network: 'You seem to be offline. Check your connection and try again.',
  timeout: 'The server took too long to answer. Please try again.',
  malformed_response: 'The server answered something unexpected. Please try again.'
};

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  get baseUrl(): string {
    return this.options.baseUrl;
  }

  async request<T>(method: 'GET' | 'POST', path: string, body?: unknown, extraHeaders: Record<string, string> = {}, auth = true): Promise<{ data: T; status: number; headers: Headers }> {
    if (auth) await this.options.beforeRequest?.();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), this.options.timeoutMs);
    const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = auth ? this.options.getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? fetch)(`${this.options.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    } catch (error) {
      const code = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network';
      throw new ApiError(code, FRIENDLY[code], 0);
    } finally {
      window.clearTimeout(timer);
    }
    if (response.status === 304) return { data: null as T, status: 304, headers: response.headers };
    let json: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new ApiError('malformed_response', FRIENDLY.malformed_response, response.status);
      }
    }
    if (!response.ok) {
      const error = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      const apiError = new ApiError(error?.code ?? (response.status === 401 ? 'unauthorized' : response.status === 404 ? 'not_found' : 'internal_error'), error?.message ?? `Request failed (${response.status}).`, response.status, error?.details);
      // Only a refused *token* means the session is gone; a request that carried no token is not an expiry.
      if (apiError.isAuth && auth && token) this.options.onUnauthorized(apiError);
      throw apiError;
    }
    if (json === null || typeof json !== 'object') throw new ApiError('malformed_response', FRIENDLY.malformed_response, response.status);
    return { data: json as T, status: response.status, headers: response.headers };
  }

  /** A binary document (the floor SVG): same token, same error mapping, a longer timeout for multi-megabyte files. */
  async blob(path: string, timeoutMs = 90000): Promise<Blob> {
    await this.options.beforeRequest?.();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const token = this.options.getToken();
    const headers: Record<string, string> = { Accept: 'image/svg+xml, */*' };
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? fetch)(`${this.options.baseUrl}${path}`, { method: 'GET', headers, signal: controller.signal });
    } catch (error) {
      const code = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network';
      throw new ApiError(code, FRIENDLY[code], 0);
    } finally {
      window.clearTimeout(timer);
    }
    if (!response.ok) {
      type ErrorBody = { error?: { code?: string; message?: string } };
      let json: ErrorBody | null = null;
      try {
        json = (await response.json()) as ErrorBody;
      } catch {
        json = null;
      }
      const apiError = new ApiError(json?.error?.code ?? (response.status === 401 ? 'unauthorized' : response.status === 404 ? 'not_found' : 'internal_error'), json?.error?.message ?? `Request failed (${response.status}).`, response.status);
      if (apiError.isAuth && token) this.options.onUnauthorized(apiError);
      throw apiError;
    }
    return response.blob();
  }

  get<T>(path: string, headers?: Record<string, string>): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('GET', path, undefined, headers);
  }

  post<T>(path: string, body: unknown, auth = true): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('POST', path, body, {}, auth);
  }
}
