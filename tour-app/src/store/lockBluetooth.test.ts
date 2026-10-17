import { describe, expect, it } from 'vitest';
import type { LockBluetoothKey, TourRoute } from '~/models';
import { initialAppState, PERSISTED_KEYS, type AppState } from './appState';
import { reducer } from './reducer';

/**
 * The Bluetooth unlock's state: the guest key kept in memory per stop (never
 * persisted), the phases a request moves through, the stop marked unlocked
 * when the lock opened, and everything dropped with the tour or property.
 */

const key: LockBluetoothKey = { lockName: 'SK3E14001756', key: 'guest-key', keyId: 'k1', guestPin: '4455667', validFrom: null, validUntil: '2026-10-16T15:55:00+00:00', issuedAt: 1 };

const signedIn = (): AppState => ({ ...initialAppState(), signedIn: true, user: { name: 'QA', email: 'qa@example.com' }, propertyId: 1618, screen: 'stop', tourOrder: ['unit:483954'], stopIndex: 0 });

const tour: TourRoute = { route: { from: 'a', to: 'b', stepFree: false, avoidBlockers: true, lengthPx: 0, lengthFt: null, durationS: null, legs: [], steps: [], warnings: [], stages: [] }, segments: [] };

describe('Bluetooth unlock state', () => {
  it('moves through the phases and ends unlocked with the request cleared', () => {
    let state = reducer(signedIn(), { type: 'lockPhase', node: 'unit:483954', propertyId: 1618, status: 'loading' });
    expect(state.lockRequest).toEqual({ node: 'unit:483954', propertyId: 1618, status: 'loading', error: null });
    state = reducer(state, { type: 'lockKeyReady', node: 'unit:483954', propertyId: 1618, key });
    expect(state.lockKeys['unit:483954']).toEqual(key);
    for (const status of ['scanning', 'connecting', 'unlocking'] as const) {
      state = reducer(state, { type: 'lockPhase', node: 'unit:483954', propertyId: 1618, status });
      expect(state.lockRequest?.status).toBe(status);
    }
    state = reducer(state, { type: 'lockUnlocked', node: 'unit:483954', propertyId: 1618 });
    expect(state.unlocked['unit:483954']).toBe(true);
    expect(state.lockRequest).toBeNull();
    expect(state.lockKeys['unit:483954']).toEqual(key);
  });

  it('a failure keeps the key for the retry and names the reason', () => {
    let state = reducer({ ...signedIn(), lockKeys: { 'unit:483954': key } }, { type: 'lockPhase', node: 'unit:483954', propertyId: 1618, status: 'scanning' });
    state = reducer(state, { type: 'lockPinFailed', node: 'unit:483954', propertyId: 1618, message: 'The lock was not found nearby. Stand closer to the door and try again.' });
    expect(state.lockRequest).toMatchObject({ status: 'error', error: expect.stringContaining('not found') });
    expect(state.lockKeys['unit:483954']).toEqual(key);
    expect(state.unlocked['unit:483954']).toBeUndefined();
    expect(reducer(state, { type: 'lockPinDismiss' }).lockRequest).toBeNull();
  });

  it('phases, keys and the unlocked mark for a property the visitor left are dropped', () => {
    const state = reducer(signedIn(), { type: 'selectProperty', propertyId: 42 });
    expect(reducer(state, { type: 'lockPhase', node: 'unit:483954', propertyId: 1618, status: 'scanning' })).toBe(state);
    expect(reducer(state, { type: 'lockKeyReady', node: 'unit:483954', propertyId: 1618, key })).toBe(state);
    expect(reducer(state, { type: 'lockUnlocked', node: 'unit:483954', propertyId: 1618 })).toBe(state);
  });

  it('keys are memory only: never persisted, gone with a new tour, another property, sign-out or a relaunch', () => {
    const withKey = reducer(signedIn(), { type: 'lockKeyReady', node: 'unit:483954', propertyId: 1618, key });
    expect(PERSISTED_KEYS).not.toContain('lockKeys');
    expect(reducer(withKey, { type: 'tourReady', tour, order: ['unit:483954'], mode: 'self' }).lockKeys).toEqual({});
    expect(reducer(withKey, { type: 'resetTour' }).lockKeys).toEqual({});
    expect(reducer(withKey, { type: 'selectProperty', propertyId: 42 }).lockKeys).toEqual({});
    expect(reducer(withKey, { type: 'signOut' }).lockKeys).toEqual({});
    const hydrated = reducer(initialAppState(), { type: 'hydrate', state: { ...withKey } });
    expect(hydrated.lockKeys).toEqual({});
    expect(hydrated.lockRequest).toBeNull();
    expect(reducer(withKey, { type: 'exitStop' }).lockKeys['unit:483954']).toEqual(key);
  });
});
