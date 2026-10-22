import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The two session kinds against a fake Tour App API: a visitor signs in with
 * a phone and a code, is restored through `GET /visitor/me` (staff through
 * `GET /auth/me`), logs out through `POST /visitor/logout`, books without
 * identity fields, and a visit is started, fed and ended; the door-code
 * request names the visit. The session store is an in-memory map here.
 */

const stored = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: stored.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void stored.set(key, value),
    remove: async ({ key }: { key: string }) => void stored.delete(key)
  }
}));

const { ApiError } = await import('./apiClient');
const { PynwheelApiTourRepository } = await import('./pynwheelApiTourRepository');

type Call = { url: string; method: string; body: Record<string, unknown> | undefined; auth: string | undefined };

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const visitor = { id: 42, first_name: 'Ada', last_name: 'Lovelace', name: 'Ada Lovelace', email: 'ada@example.com', phone_number: '+13035550100', phone_masked: '•••0100', is_sms_enabled: true, role: 'visitor' as const };
const booking = { id: 501, property_id: 1618, property_name: 'Hazel', status: 'upcoming', tour_date: '2026-10-24', tour_time: '18:00', tour_time_label: '6:00 PM', end_time: '18:45', tour_type: 'self_tour', property_tour_type: 'scheduled_tour', created_by: 'tour_app', is_tour_completed: false, desired_bedroom: null, desired_move_in_date: null };
const caps = { visits: true, visitor_auth: true };
const verified = { success: true, access_token: 'vst_secret', token_type: 'bearer', expires_at: '2099-01-01T00:00:00Z', visitor, bookings: [booking], capabilities: caps };
const visitJson = { id: 77, status: 'in_progress', tour_key: 'k', tour_type: 'self_tour', tour_site: 'onsite', booking_id: 501, source: 'tour_app', started_at: '2026-10-24T18:00:00Z', active: true, access_window: { starts_at: '2026-10-24T18:00:00Z', ends_at: '2026-10-24T18:45:00Z', minutes: 45 }, verification_required: false, created: true };

describe('visitor and staff sessions', () => {
  const calls: Call[] = [];
  let answer: (call: Call) => Response;

  beforeEach(() => {
    calls.length = 0;
    stored.clear();
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) });
    answer = ({ url }) => {
      if (url.endsWith('/health')) return json(200, { success: true, status: 'ok', database: true, env: 'test', capabilities: caps });
      if (url.endsWith('/visitor/otp')) return json(202, { success: true, sent: true, resend_after: 60 });
      if (url.endsWith('/visitor/otp/verify')) return json(200, verified);
      if (url.endsWith('/visitor/me')) return json(200, { success: true, visitor: { ...visitor, first_name: 'Augusta', name: 'Augusta Lovelace' }, expires_at: verified.expires_at, bookings: [booking], open_visit: null, capabilities: caps });
      if (url.endsWith('/visitor/logout')) return json(200, { success: true, revoked: true });
      if (url.endsWith('/auth/login')) return json(200, { success: true, access_token: 'tok-1', token_type: 'bearer', expires_at: null, user: { id: 7, name: 'QA', email: 'qa@example.com', role: 'super_admin' }, capabilities: caps });
      if (url.endsWith('/auth/me')) return json(200, { success: true, user: { id: 7 }, capabilities: caps });
      return json(404, { success: false, error: { code: 'not_found', message: `no route for ${url}` } });
    };
  });
  afterEach(() => vi.unstubAllGlobals());

  const repository = () => {
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const call: Call = { url: String(input), method: init?.method ?? 'GET', body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined, auth: headers.Authorization };
      calls.push(call);
      return answer(call);
    }) as typeof fetch;
    return new PynwheelApiTourRepository({ baseUrl: 'http://cms.test', timeoutMs: 2000, fetchImpl });
  };

  it('reads the server capabilities from /health without a token, once', async () => {
    const repo = repository();
    expect(await repo.getCapabilities()).toEqual({ visits: true, visitorAuth: true });
    await repo.getCapabilities();
    const health = calls.filter((c) => c.url.endsWith('/health'));
    expect(health).toHaveLength(1);
    expect(health[0].auth).toBeUndefined();
  });

  it('a visitor signs in with a code: a visitor session with the profile, the bookings and the next booking\'s property', async () => {
    const repo = repository();
    const sent = await repo.requestVisitorCode('(303) 555-0100');
    expect(sent.resendAfterS).toBe(60);
    expect(calls.at(-1)).toMatchObject({ url: 'http://cms.test/api/tour/v1/visitor/otp', method: 'POST', body: { phone: '(303) 555-0100', country_code: 'US' }, auth: undefined });
    const { session, bookings } = await repo.verifyVisitorCode({ phone: '(303) 555-0100', code: '123456' });
    expect(calls.at(-1)?.body).toEqual({ phone: '(303) 555-0100', code: '123456', country_code: 'US' });
    expect(session).toMatchObject({ kind: 'visitor', accessToken: 'vst_secret', propertyId: 1618, capabilities: { visits: true, visitorAuth: true } });
    expect(session.user).toEqual({ id: 42, name: 'Ada Lovelace', email: 'ada@example.com', role: 'visitor', phone: '+13035550100' });
    expect(session.visitor?.phoneMasked).toBe('•••0100');
    expect(bookings).toEqual([{ id: 501, propertyId: 1618, propertyName: 'Hazel', status: 'upcoming', date: '2026-10-24', time: '18:00', timeLabel: '6:00 PM', endTime: '18:45', tourType: 'self_tour', createdBy: 'tour_app' }]);
    expect(repo.currentSession()?.kind).toBe('visitor');
    expect(JSON.parse(stored.get('pynwheel_tour_session_v1') ?? '{}')).toMatchObject({ kind: 'visitor', accessToken: 'vst_secret' });
  });

  it('a new visitor is asked for a profile, then sends the same code with it', async () => {
    const repo = repository();
    const first = answer;
    answer = (call) => (call.url.endsWith('/visitor/otp/verify') && !call.body?.first_name ? json(422, { success: false, error: { code: 'profile_required', message: 'Tell us your name and email to finish signing in.', details: { fields: ['first_name', 'last_name', 'email'] } } }) : first(call));
    await expect(repo.verifyVisitorCode({ phone: '3035550100', code: '123456' })).rejects.toMatchObject({ code: 'profile_required', status: 422, details: { fields: ['first_name', 'last_name', 'email'] } });
    const { session } = await repo.verifyVisitorCode({ phone: '3035550100', code: '123456', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });
    expect(calls.at(-1)?.body).toMatchObject({ phone: '3035550100', code: '123456', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' });
    expect(session.kind).toBe('visitor');
    answer = (call) => (call.url.endsWith('/visitor/otp/verify') ? json(401, { success: false, error: { code: 'invalid_code', message: 'That code is not valid. Ask for a new one.' } }) : first(call));
    await expect(repo.verifyVisitorCode({ phone: '3035550100', code: '000000' })).rejects.toMatchObject({ code: 'invalid_code', status: 401 });
  });

  it('restores a visitor session through GET /visitor/me (the server\'s profile wins) and a staff one through GET /auth/me', async () => {
    const visitorRepo = repository();
    await visitorRepo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    calls.length = 0;
    const restored = await repository().restoreSession();
    expect(calls.map((c) => c.url.replace('http://cms.test/api/tour/v1', ''))).toEqual(['/visitor/me']);
    expect(calls[0].auth).toBe('Bearer vst_secret');
    expect(restored).toMatchObject({ kind: 'visitor', user: { name: 'Augusta Lovelace' } });
    expect(restored?.visitor?.firstName).toBe('Augusta');

    stored.clear();
    const staffRepo = repository();
    await staffRepo.login('qa@example.com', 'secret');
    calls.length = 0;
    const staff = await repository().restoreSession();
    expect(calls.map((c) => c.url.replace('http://cms.test/api/tour/v1', ''))).toEqual(['/auth/me']);
    expect(staff).toMatchObject({ kind: 'staff', user: { role: 'super_admin' }, capabilities: { visits: true, visitorAuth: true } });
  });

  it('a visitor token the server no longer accepts ends the session on restore and on any later call', async () => {
    const repo = repository();
    await repo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    const ok = answer;
    answer = (call) => (call.url.endsWith('/visitor/me') ? json(401, { success: false, error: { code: 'token_revoked', message: 'Please sign in again.' } }) : ok(call));
    expect(await repository().restoreSession()).toBeNull();
    expect(stored.has('pynwheel_tour_session_v1')).toBe(false);
    // Offline on restore: the session is kept for when the phone is back.
    await repo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    answer = () => {
      throw new TypeError('Failed to fetch');
    };
    expect((await repository().restoreSession())?.kind).toBe('visitor');
  });

  it('a visitor logs out through POST /visitor/logout and the session is gone locally first', async () => {
    const repo = repository();
    await repo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    await repo.logout();
    expect(calls.at(-1)).toMatchObject({ url: 'http://cms.test/api/tour/v1/visitor/logout', method: 'POST', auth: 'Bearer vst_secret' });
    expect(repo.currentSession()).toBeNull();
    expect(stored.has('pynwheel_tour_session_v1')).toBe(false);
  });

  it('a visitor books without identity fields, cancels by booking id, and edits their profile through PUT /visitor/me', async () => {
    const repo = repository();
    await repo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    const ok = answer;
    answer = (call) => {
      if (call.url.endsWith('/bookings') && call.method === 'POST') return json(201, { booking: { id: 777, status: 'upcoming', tour_date: '2026-10-25', tour_time: '10:00', tour_time_label: '10:00 AM', end_time: null, tour_type: 'self_tour', property_tour_type: 'scheduled_tour', created_by: 'tour_app', rescheduled: false }, visitor: { id: 42, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', phone_number: '+13035550100' }, notifications: { email: true, sms: true, web: false } });
      if (call.url.endsWith('/bookings/777') && call.method === 'DELETE') return json(200, { success: true, cancelled: 777 });
      if (call.url.endsWith('/visitor/me') && call.method === 'PUT') return json(200, { success: true, visitor: { ...visitor, first_name: 'Ada', last_name: 'King', name: 'Ada King' } });
      return ok(call);
    };
    const result = await repo.requestBooking({ date: '2026-10-25', time: '10:00', tourType: 'self_tour', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '3035550100', lengthMinutes: 45 });
    expect(calls.at(-1)?.body).toEqual({ tour_type: 'self_tour', property_tour_type: 'scheduled_tour', tour_date: '2026-10-25', tour_time: '10:00', length_minutes: 45 });
    expect(result).toMatchObject({ id: '777', visitorId: 42 });
    await repo.cancelBooking(777);
    expect(calls.at(-1)).toMatchObject({ url: 'http://cms.test/api/tour/v1/properties/1618/bookings/777', method: 'DELETE' });
    const updated = await repo.updateVisitorProfile({ lastName: 'King' });
    expect(calls.at(-1)).toMatchObject({ method: 'PUT', body: { last_name: 'King' } });
    expect(updated.user.name).toBe('Ada King');
    expect(updated.visitor?.phone).toBe('+13035550100');
  });

  it('a visit is started with its client id, fed events, ended; the door code names it', async () => {
    const repo = repository();
    await repo.verifyVisitorCode({ phone: '3035550100', code: '123456' });
    const ok = answer;
    answer = (call) => {
      if (call.url.endsWith('/visits') && call.method === 'POST') return json(201, { success: true, visit: visitJson, booking });
      if (call.url.endsWith('/visits/77/events')) return json(207, { success: true, visit_id: 77, accepted: [{ index: 0, client_event_id: 'e1', kind: 'arrived', id: 1, duplicate: false }], rejected: [{ index: 1, client_event_id: 'e2', code: 'invalid_stop', message: 'This stop is not on the tour.' }] });
      if (call.url.endsWith('/visits/77/end')) return json(200, { success: true, visit: { ...visitJson, status: 'completed', active: false, ended_at: '2026-10-24T18:40:00Z' } });
      if (call.url.endsWith('/locks/pin')) return json(200, { success: true, stop_id: 'unit:1', provider: 'Igloohome', mode: 'igloohome', device_id: 'd', access_name: '101', pin: '221673337', valid_from: null, valid_until: null });
      return ok(call);
    };
    const visit = await repo.startVisit({ clientVisitId: 'c0ffee00-0000-4000-8000-000000000001', bookingId: 501, tourType: 'self_tour', startedAt: '2026-10-24T18:00:00Z' });
    expect(calls.at(-1)?.body).toMatchObject({ client_visit_id: 'c0ffee00-0000-4000-8000-000000000001', booking_id: 501, tour_type: 'self_tour', started_at: '2026-10-24T18:00:00Z', app_version: expect.any(String), device_time_zone: expect.any(String) });
    expect(calls.at(-1)?.body).not.toHaveProperty('tour_user_id');
    expect(visit).toMatchObject({ id: 77, accessEndsAt: '2026-10-24T18:45:00Z', accessMinutes: 45, bookingId: 501, verificationRequired: false, created: true });

    const result = await repo.sendVisitEvents(77, [
      { clientEventId: 'e1', kind: 'arrived', stopId: 'unit:1', occurredAt: '2026-10-24T18:05:00Z', payload: { code: '221673337' } },
      { clientEventId: 'e2', kind: 'skipped', stopId: 'unit:999', occurredAt: '2026-10-24T18:06:00Z', payload: { reason: 'lock' } }
    ]);
    expect(calls.at(-1)?.body).toEqual({ events: [{ client_event_id: 'e1', kind: 'arrived', stop_id: 'unit:1', occurred_at: '2026-10-24T18:05:00Z', payload: { code: '221673337' } }, { client_event_id: 'e2', kind: 'skipped', stop_id: 'unit:999', occurred_at: '2026-10-24T18:06:00Z', payload: { reason: 'lock' } }] });
    expect(result.accepted).toEqual([{ index: 0, clientEventId: 'e1', kind: 'arrived', id: 1, duplicate: false }]);
    expect(result.rejected).toEqual([{ index: 1, clientEventId: 'e2', code: 'invalid_stop', message: 'This stop is not on the tour.' }]);

    await repo.getStopLockPin('unit:1', 77);
    expect(calls.at(-1)?.body).toEqual({ stop_id: 'unit:1', visit_id: 77 });

    const ended = await repo.endVisit(77, { endedAt: '2026-10-24T18:40:00Z', reason: 'completed' });
    expect(calls.at(-1)?.body).toEqual({ ended_at: '2026-10-24T18:40:00Z', reason: 'completed' });
    expect(ended).toMatchObject({ id: 77, status: 'completed', active: false });

    answer = (call) => (call.url.endsWith('/visits') ? json(422, { success: false, error: { code: 'outside_window', message: 'This booking cannot be checked in now.', details: { booked_at: '2026-10-24T18:00:00Z', grace_minutes: 45 } } }) : ok(call));
    await expect(repo.startVisit({ clientVisitId: 'x', tourType: 'self_tour', startedAt: 'now' })).rejects.toMatchObject({ code: 'outside_window', status: 422, details: { grace_minutes: 45 } });
    expect(ApiError).toBeDefined();
  });
});
