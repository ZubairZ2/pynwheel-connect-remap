import { describe, expect, it } from 'vitest';
import type { LockPin } from '~/models';
import { initialAppState, type AppState } from './appState';
import { reducer } from './reducer';

/**
 * Regressions found in the October 17, 2026 platform QA pass:
 * - one stop's lock answer must not clear another stop's in-flight request;
 * - signing out must not hand the next account the previous one's "verified" badge;
 * - an application that failed to start must not be recorded as applied.
 * - Back from the sign-in confirmation and "Continue as Guest" must not leave a live session behind;
 * - a pending Schedule must survive the property pick that follows sign-in, and only that.
 */

const pin: LockPin = { pin: '221673337', validFrom: '2026-10-16T14:00:00+05:00', validUntil: '2026-10-16T17:00:00+05:00', issuedAt: 1 };

const signedIn = (): AppState => ({ ...initialAppState(), signedIn: true, user: { name: 'QA', email: 'qa@example.com' }, propertyId: 1618, screen: 'stop', tourOrder: ['unit:1', 'unit:2'], stopIndex: 0 });

describe('lock answers and in-flight requests', () => {
  it('a code for stop A leaves stop B\'s running request in place', () => {
    let state = reducer(signedIn(), { type: 'lockPinStart', node: 'unit:1' });
    state = reducer(state, { type: 'lockPinStart', node: 'unit:2' });
    expect(state.lockRequest?.node).toBe('unit:2');
    state = reducer(state, { type: 'lockPinReady', node: 'unit:1', propertyId: 1618, pin });
    expect(state.lockPins['unit:1']).toEqual(pin);
    expect(state.unlocked['unit:1']).toBe(true);
    expect(state.lockRequest).toEqual({ node: 'unit:2', propertyId: 1618, status: 'loading', error: null });
  });

  it('a code for the stop whose request is running clears that request', () => {
    let state = reducer(signedIn(), { type: 'lockPinStart', node: 'unit:1' });
    state = reducer(state, { type: 'lockPinReady', node: 'unit:1', propertyId: 1618, pin });
    expect(state.lockRequest).toBeNull();
  });

  it('a Bluetooth unlock of stop A leaves stop B\'s running request in place', () => {
    let state = reducer(signedIn(), { type: 'lockPhase', node: 'unit:2', propertyId: 1618, status: 'scanning' });
    state = reducer(state, { type: 'lockUnlocked', node: 'unit:1', propertyId: 1618 });
    expect(state.unlocked['unit:1']).toBe(true);
    expect(state.lockRequest?.node).toBe('unit:2');
    expect(reducer(state, { type: 'lockUnlocked', node: 'unit:2', propertyId: 1618 }).lockRequest).toBeNull();
  });
});

describe('sign-out', () => {
  it('does not carry the verified badge over to the next account', () => {
    const state = reducer({ ...signedIn(), verified: true }, { type: 'signOut' });
    expect(state.signedIn).toBe(false);
    expect(state.verified).toBe(initialAppState().verified);
  });
});

describe('online application', () => {
  it('a failed start closes the sheet with the reason and does not mark the journey applied', () => {
    let state = reducer(signedIn(), { type: 'openApply', unit: 'unit:1' });
    state = reducer(state, { type: 'applySubmitting' });
    state = reducer(state, { type: 'applyFailed', message: 'Online applications are not available for this property yet.' });
    expect(state.applySubmitting).toBe(false);
    expect(state.overlays).not.toContain('apply');
    expect(state.toast).toBe('Online applications are not available for this property yet.');
    expect(state.journey.applied).toBe(false);
  });

  it('a successful start marks the journey applied', () => {
    let state = reducer(signedIn(), { type: 'openApply', unit: 'unit:1' });
    state = reducer(state, { type: 'applyDone', message: 'Application started.' });
    expect(state.journey.applied).toBe(true);
  });
});

describe('sign-in confirmation and guest mode', () => {
  it('Back from the confirmation clears the session, not just the step', () => {
    const state = reducer({ ...signedIn(), screen: 'getStarted', authStep: 'confirm', password: 'x' }, { type: 'authBack' });
    expect(state.authStep).toBe('email');
    expect(state.signedIn).toBe(false);
    expect(state.user).toBeNull();
    expect(state.propertyId).toBeNull();
    expect(state.password).toBe('');
  });

  it('Continue as Guest ends a live session', () => {
    const state = reducer({ ...signedIn(), screen: 'getStarted' }, { type: 'continueAsGuest' });
    expect(state.guest).toBe(true);
    expect(state.signedIn).toBe(false);
    expect(state.user).toBeNull();
    expect(state.screen).toBe('home');
  });
});

describe('pending action after sign-in', () => {
  it('survives the confirmation when a property must be picked first, and opens Schedule once it is', () => {
    let state = reducer({ ...signedIn(), propertyId: null, authStep: 'confirm', pendingAfterAuth: 'schedule' }, { type: 'confirmProfile' });
    expect(state.screen).toBe('search');
    expect(state.pendingAfterAuth).toBe('schedule');
    state = reducer(state, { type: 'selectProperty', propertyId: 1618 });
    expect(state.screen).toBe('schedule');
    expect(state.pendingAfterAuth).toBeNull();
  });

  it('is dropped by the confirmation for anything else without a property', () => {
    const state = reducer({ ...signedIn(), propertyId: null, authStep: 'confirm', pendingAfterAuth: 'book' }, { type: 'confirmProfile' });
    expect(state.pendingAfterAuth).toBeNull();
  });

  it('is cleared by navigating elsewhere', () => {
    const state = reducer({ ...signedIn(), pendingAfterAuth: 'schedule' }, { type: 'navigate', screen: 'search' });
    expect(state.pendingAfterAuth).toBeNull();
  });

  it('a property pick that asks for Schedule opens it only through the action itself', () => {
    const state = reducer({ ...signedIn(), propertyId: 1 }, { type: 'selectProperty', propertyId: 2, then: 'schedule' });
    expect(state.propertyId).toBe(2);
    expect(state.screen).toBe('schedule');
    expect(reducer({ ...signedIn(), propertyId: 1 }, { type: 'selectProperty', propertyId: 2 }).screen).toBe('home');
  });
});
