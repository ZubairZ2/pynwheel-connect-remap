import { describe, expect, it } from 'vitest';
import type { LockPin, TourRoute } from '~/models';
import { initialAppState, PERSISTED_KEYS, type AppState } from './appState';
import { reducer } from './reducer';

/**
 * The door-code state machine: one request at a time per stop, the code
 * kept (and persisted) until the next tour, property change or sign-out,
 * and an answer for a property the visitor has left is dropped.
 */

const pin: LockPin = { pin: '221673337', validFrom: '2026-10-16T14:00:00+05:00', validUntil: '2026-10-16T17:00:00+05:00', issuedAt: 1 };

const signedIn = (): AppState => ({ ...initialAppState(), signedIn: true, user: { name: 'QA', email: 'qa@example.com' }, propertyId: 3539, screen: 'stop', tourOrder: ['unit:1'], stopIndex: 0 });

const tour: TourRoute = { route: { from: 'a', to: 'b', stepFree: false, avoidBlockers: true, lengthPx: 0, lengthFt: null, durationS: null, legs: [], steps: [], warnings: [], stages: [] }, segments: [] };

describe('door codes', () => {
  it('a request, then the code: kept by stop, the stop counts as unlocked, the request is cleared', () => {
    let state = reducer(signedIn(), { type: 'lockPinStart', node: 'unit:1' });
    expect(state.lockRequest).toEqual({ node: 'unit:1', propertyId: 3539, status: 'loading', error: null });
    state = reducer(state, { type: 'lockPinReady', node: 'unit:1', propertyId: 3539, pin });
    expect(state.lockPins['unit:1']).toEqual(pin);
    expect(state.unlocked['unit:1']).toBe(true);
    expect(state.lockRequest).toBeNull();
  });

  it('a failure keeps the error for the stop and leaves any earlier code in place', () => {
    let state = reducer({ ...signedIn(), lockPins: { 'unit:1': pin } }, { type: 'lockPinStart', node: 'unit:1' });
    state = reducer(state, { type: 'lockPinFailed', node: 'unit:1', propertyId: 3539, message: 'The lock service could not be reached. Please try again.' });
    expect(state.lockRequest).toEqual({ node: 'unit:1', propertyId: 3539, status: 'error', error: 'The lock service could not be reached. Please try again.' });
    expect(state.lockPins['unit:1']).toEqual(pin);
    expect(reducer(state, { type: 'lockPinDismiss' }).lockRequest).toBeNull();
  });

  it('an answer for a property the visitor has since left is dropped', () => {
    let state = reducer(signedIn(), { type: 'lockPinStart', node: 'unit:1' });
    state = reducer(state, { type: 'selectProperty', propertyId: 42 });
    expect(state.lockRequest).toBeNull();
    const after = reducer(state, { type: 'lockPinReady', node: 'unit:1', propertyId: 3539, pin });
    expect(after).toBe(state);
    expect(after.lockPins).toEqual({});
    expect(reducer(state, { type: 'lockPinFailed', node: 'unit:1', propertyId: 3539, message: 'late' })).toBe(state);
  });

  it('codes survive leaving and re-entering the stop, and persist; they go with a new tour, a property change or sign-out', () => {
    const withPin = reducer(signedIn(), { type: 'lockPinReady', node: 'unit:1', propertyId: 3539, pin });
    expect(reducer(withPin, { type: 'exitStop' }).lockPins['unit:1']).toEqual(pin);
    expect(reducer(withPin, { type: 'leaveTour' }).lockPins['unit:1']).toEqual(pin);
    expect(PERSISTED_KEYS).toContain('lockPins');
    expect(reducer(withPin, { type: 'tourReady', tour, order: ['unit:1'], mode: 'self' }).lockPins).toEqual({});
    expect(reducer(withPin, { type: 'resetTour' }).lockPins).toEqual({});
    expect(reducer(withPin, { type: 'selectProperty', propertyId: 42 }).lockPins).toEqual({});
    expect(reducer(withPin, { type: 'selectProperty', propertyId: 3539 }).lockPins['unit:1']).toEqual(pin);
    expect(reducer(withPin, { type: 'signOut' }).lockPins).toEqual({});
    expect(reducer(withPin, { type: 'sessionExpired', message: 'gone' }).lockPins).toEqual({});
  });

  it('a relaunch restores the codes but never a request in flight', () => {
    const persisted = { ...signedIn(), lockPins: { 'unit:1': pin }, lockRequest: { node: 'unit:1', propertyId: 3539, status: 'loading' as const, error: null } };
    const state = reducer(initialAppState(), { type: 'hydrate', state: persisted });
    expect(state.lockPins['unit:1']).toEqual(pin);
    expect(state.lockRequest).toBeNull();
  });
});
