import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The ID verification endpoints against a fake Tour App API (October 28,
 * 2026): the status is parsed as the server shapes it, an attempt sends the
 * three pictures once with the long timeout, the server's reading of the
 * provider's answer comes back as is, a 422 keeps its code, and the card
 * step sends a Stripe token and never a card number.
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
const { parseVerificationStatus } = await import('./parsers');

type Call = { url: string; method: string; body: Record<string, unknown> | undefined; auth: string | undefined };
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const visitor = { id: 42, first_name: 'Ada', last_name: 'Lovelace', name: 'Ada Lovelace', email: 'ada@example.com', phone_number: '+13035550100', phone_masked: '•••0100', is_sms_enabled: true, role: 'visitor' as const };
const caps = { visits: true, visitor_auth: true };
const statusJson = {
  property_id: 1618,
  provider: 'check_point_id',
  provider_available: true,
  property_requires: true,
  required: true,
  state: 'never',
  verified_at: null,
  valid_until: null,
  verified_by: null,
  valid_for_days: 30,
  attempts_left: 5,
  document_types: [
    { key: 'drivers_license', label: "Driver's license", back: true },
    { key: 'passport', label: 'Passport', back: false },
    { key: 'wallet', label: 'Not a thing', back: false }
  ],
  card: { required: true, on_file: false, needed: true, last4: null, available: true, publishable_key: 'pk_test_x' }
};
const verifiedJson = { ...statusJson, required: false, state: 'verified', verified_at: '2026-10-28T10:00:00Z', valid_until: '2026-11-27T10:00:00Z', verified_by: 'CheckpointID', attempts_left: 4 };
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';

describe('ID verification through the Tour App API', () => {
  const calls: Call[] = [];
  let answer: (call: Call) => Response;
  let repo: InstanceType<typeof PynwheelApiTourRepository>;

  beforeEach(async () => {
    calls.length = 0;
    stored.clear();
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) });
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const call: Call = { url, method: init?.method ?? 'GET', body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined, auth: headers.Authorization };
      calls.push(call);
      return answer(call);
    };
    answer = (call) => {
      if (call.url.endsWith('/visitor/otp/verify')) return json(200, { success: true, access_token: 'vst_secret', token_type: 'bearer', expires_at: '2099-01-01T00:00:00Z', visitor, bookings: [], capabilities: caps });
      return json(404, { success: false, error: { code: 'not_found', message: 'no' } });
    };
    repo = new PynwheelApiTourRepository({ baseUrl: 'http://api.test', timeoutMs: 1000, fetchImpl });
    await repo.verifyVisitorCode({ phone: '+13035550100', code: '123456' });
    await repo.selectProperty(1618);
    calls.length = 0;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the status as the server shapes it and drops unknown document types', async () => {
    answer = () => json(200, { success: true, verification: statusJson });
    const status = await repo.getVerificationStatus();
    expect(calls[0]).toMatchObject({ method: 'GET', url: 'http://api.test/api/tour/v1/properties/1618/verification', auth: 'Bearer vst_secret' });
    expect(status).toMatchObject({ propertyId: 1618, required: true, state: 'never', providerAvailable: true, attemptsLeft: 5, validForDays: 30 });
    expect(status.documentTypes.map((t) => t.key)).toEqual(['drivers_license', 'passport']);
    expect(status.card).toEqual({ required: true, onFile: false, needed: true, last4: null, available: true, publishableKey: 'pk_test_x' });
    expect(parseVerificationStatus({ ...statusJson, state: 'odd' } as never).state).toBe('never');
    expect(() => parseVerificationStatus(null)).toThrow(ApiError);
  });

  it('sends the three pictures once and answers the server reading of the provider answer', async () => {
    answer = () => json(200, { success: true, result: { outcome: 'verified', reason: null, code: null }, verification: verifiedJson });
    const result = await repo.submitIdVerification({ documentType: 'drivers_license', frontImage: IMG, backImage: `${IMG}B`, selfieImage: `${IMG}S` });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://api.test/api/tour/v1/properties/1618/verification' });
    expect(calls[0].body).toEqual({ document_type: 'drivers_license', front_image: IMG, back_image: `${IMG}B`, selfie_image: `${IMG}S` });
    expect(result.outcome).toBe('verified');
    expect(result.status).toMatchObject({ state: 'verified', required: false, verifiedBy: 'CheckpointID', attemptsLeft: 4 });

    answer = () => json(200, { success: true, result: { outcome: 'face_mismatch', reason: 'The Face has not been matched', code: 'ValidationError' }, verification: { ...statusJson, attempts_left: 4 } });
    const failed = await repo.submitIdVerification({ documentType: 'passport', frontImage: IMG, backImage: null, selfieImage: IMG });
    expect(calls[1].body).not.toHaveProperty('back_image');
    expect(failed).toMatchObject({ outcome: 'face_mismatch', reason: 'The Face has not been matched', code: 'ValidationError' });
    expect(failed.status.state).toBe('never');
  });

  it('keeps the server error codes: the attempt limit, the provider down, a malformed answer', async () => {
    answer = () => json(422, { success: false, error: { code: 'attempt_limit', message: 'Too many verification attempts.', details: { retry_after: 3600 } } });
    await expect(repo.submitIdVerification({ documentType: 'passport', frontImage: IMG, backImage: null, selfieImage: IMG })).rejects.toMatchObject({ code: 'attempt_limit', status: 422 });
    answer = () => json(503, { success: false, error: { code: 'provider_unavailable', message: 'ID verification is not available right now.' } });
    await expect(repo.submitIdVerification({ documentType: 'passport', frontImage: IMG, backImage: null, selfieImage: IMG })).rejects.toMatchObject({ code: 'provider_unavailable', status: 503 });
    answer = () => json(200, { success: true, result: { outcome: 'maybe' }, verification: statusJson });
    await expect(repo.submitIdVerification({ documentType: 'passport', frontImage: IMG, backImage: null, selfieImage: IMG })).rejects.toMatchObject({ code: 'malformed_response' });
  });

  it('saves the card with a Stripe token only and answers the refreshed status', async () => {
    answer = () => json(200, { success: true, card: { saved: true, last4: '4242' }, verification: { ...verifiedJson, card: { required: true, on_file: true, needed: false, last4: '4242', available: true, publishable_key: null } } });
    const status = await repo.saveCardOnFile('tok_visa');
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://api.test/api/tour/v1/properties/1618/verification/card' });
    expect(calls[0].body).toEqual({ card_token: 'tok_visa' });
    expect(JSON.stringify(calls[0].body)).not.toMatch(/4242 ?4242/);
    expect(status.card).toMatchObject({ onFile: true, needed: false, last4: '4242' });
    answer = () => json(422, { success: false, error: { code: 'card_declined', message: 'Your card was declined.' } });
    await expect(repo.saveCardOnFile('tok_declined')).rejects.toMatchObject({ code: 'card_declined', message: 'Your card was declined.' });
  });
});
