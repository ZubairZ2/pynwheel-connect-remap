import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiClient';
import { PynwheelApiTourRepository } from './pynwheelApiTourRepository';

/**
 * `getStopLockPin` against a fake Tour App API: the request it sends, the
 * code it returns, and how the API's refusals and a lost session surface.
 * The session store (@capacitor/preferences) has no backend under Node, so
 * the session lives in memory for the test: sign in, choose the property.
 */

type Call = { url: string; init: RequestInit };

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const login = { success: true, access_token: 'tok-1', token_type: 'bearer', expires_at: null, user: { id: 7, name: 'QA', email: 'qa@example.com', role: 'super_admin' } };

describe('getStopLockPin', () => {
  const calls: Call[] = [];
  let answer: (url: string) => Response;

  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) });
  });
  afterEach(() => vi.unstubAllGlobals());

  const repository = async () => {
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      if (url.endsWith('/auth/login')) return json(200, login);
      return answer(url);
    }) as typeof fetch;
    const repo = new PynwheelApiTourRepository({ baseUrl: 'http://cms.test', timeoutMs: 2000, fetchImpl });
    await repo.login('qa@example.com', 'secret');
    await repo.selectProperty(3539);
    return repo;
  };

  it('posts the stop to the property and returns the code with its window', async () => {
    answer = () => json(200, { success: true, stop_id: 'unit:691948', provider: 'Igloohome', mode: 'igloohome', device_id: 'SK3E14001756', access_name: '101', pin: '221673337', valid_from: '2026-10-16T14:00:00+05:00', valid_until: '2026-10-16T17:00:00+05:00' });
    const repo = await repository();
    const pin = await repo.getStopLockPin('unit:691948');
    expect(pin.pin).toBe('221673337');
    expect(pin.validUntil).toBe('2026-10-16T17:00:00+05:00');
    const call = calls.at(-1)!;
    expect(call.url).toBe('http://cms.test/api/tour/v1/properties/3539/locks/pin');
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(String(call.init.body))).toEqual({ stop_id: 'unit:691948' });
    expect((call.init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it("the API's refusal reaches the caller with its code and message", async () => {
    answer = () => json(422, { success: false, error: { code: 'lock_unsupported', message: 'This igloohome lock opens over Bluetooth, which this app cannot do yet. Ask the leasing office for access.' } });
    const repo = await repository();
    await expect(repo.getStopLockPin('unit:1')).rejects.toMatchObject({ name: 'ApiError', code: 'lock_unsupported', status: 422, message: expect.stringContaining('Bluetooth') });
    answer = () => json(502, { success: false, error: { code: 'lock_unavailable', message: 'The lock service did not issue a door code. Please try again.' } });
    await expect(repo.getStopLockPin('unit:1')).rejects.toMatchObject({ code: 'lock_unavailable', status: 502 });
  });

  it('a 200 without a code is a malformed answer, never a blank code', async () => {
    answer = () => json(200, { success: true, stop_id: 'unit:1' });
    const repo = await repository();
    await expect(repo.getStopLockPin('unit:1')).rejects.toMatchObject({ code: 'malformed_response' });
  });

  it('a refused token ends the session and tells the app', async () => {
    answer = () => json(401, { success: false, error: { code: 'token_expired', message: 'Your session has expired. Please sign in again.' } });
    const repo = await repository();
    const expired: string[] = [];
    repo.onSessionExpired((message) => expired.push(message));
    await expect(repo.getStopLockPin('unit:1')).rejects.toBeInstanceOf(ApiError);
    expect(expired).toEqual(['Your session has expired. Please sign in again.']);
    await expect(repo.getStopLockPin('unit:1')).rejects.toMatchObject({ code: 'no_property' });
  });

  it('a network failure is reported as such', async () => {
    answer = () => {
      throw new TypeError('Failed to fetch');
    };
    const repo = await repository();
    await expect(repo.getStopLockPin('unit:1')).rejects.toMatchObject({ code: 'network', status: 0 });
  });
});
