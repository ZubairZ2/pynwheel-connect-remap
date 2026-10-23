import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The session store: a staff and a visitor session round-trip through
 * Preferences, a session saved before the visitor sign-in existed is read
 * as a staff one, and the server's capabilities are read defensively.
 */

const store = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void store.set(key, value),
    remove: async ({ key }: { key: string }) => void store.delete(key)
  }
}));

const { clearSession, loadSession, parseCapabilities, saveSession } = await import('./session');

describe('the session store', () => {
  beforeEach(() => store.clear());

  it('keeps a visitor session with its kind, profile and capabilities', async () => {
    await saveSession({
      kind: 'visitor',
      accessToken: 'vst_abc',
      expiresAt: '2026-11-22T00:00:00Z',
      user: { id: 9, name: 'Ada Lovelace', email: 'ada@example.com', role: 'visitor', phone: '+13035550100' },
      visitor: { id: 9, firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace', email: 'ada@example.com', phone: '+13035550100', phoneMasked: '•••0100', smsEnabled: true },
      propertyId: 1618,
      capabilities: { visits: true, visitorAuth: true }
    });
    const loaded = await loadSession();
    expect(loaded).toMatchObject({ kind: 'visitor', accessToken: 'vst_abc', propertyId: 1618, capabilities: { visits: true, visitorAuth: true } });
    expect(loaded?.visitor?.phone).toBe('+13035550100');
    expect(loaded?.user.role).toBe('visitor');
    await clearSession();
    expect(await loadSession()).toBeNull();
  });

  it('reads a session saved before kinds existed as a staff session without capabilities', async () => {
    store.set('pynwheel_tour_session_v1', JSON.stringify({ accessToken: 'tok-1', expiresAt: null, user: { id: 7, name: 'QA', email: 'qa@example.com', role: 'super_admin' }, propertyId: 3539 }));
    const loaded = await loadSession();
    expect(loaded).toMatchObject({ kind: 'staff', accessToken: 'tok-1', visitor: null, propertyId: 3539, capabilities: { visits: false, visitorAuth: false } });
  });

  it('ignores a broken or token-less record', async () => {
    store.set('pynwheel_tour_session_v1', '{not json');
    expect(await loadSession()).toBeNull();
    store.set('pynwheel_tour_session_v1', JSON.stringify({ user: { id: 1 } }));
    expect(await loadSession()).toBeNull();
  });

  it('parses capabilities from the API (snake_case) and from the store (camelCase), false when missing', () => {
    expect(parseCapabilities({ visits: true, visitor_auth: true })).toEqual({ visits: true, visitorAuth: true });
    expect(parseCapabilities({ visits: true, visitorAuth: false })).toEqual({ visits: true, visitorAuth: false });
    expect(parseCapabilities(null)).toEqual({ visits: false, visitorAuth: false });
    expect(parseCapabilities({ visits: 'yes' })).toEqual({ visits: false, visitorAuth: false });
  });
});
