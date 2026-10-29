import { describe, expect, it } from 'vitest';
import type { LockPin } from '~/models';
import { initialAppState, type AppState, type ScheduledTour } from './appState';
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
    const verification = { propertyId: 1618, provider: 'check_point_id', providerAvailable: true, propertyRequires: true, required: false, state: 'verified' as const, verifiedAt: '2026-10-14T14:00:00Z', validUntil: '2026-11-13T14:00:00Z', verifiedBy: 'CheckpointID', validForDays: 30, attemptsLeft: 5, documentTypes: [], card: { required: false, onFile: false, needed: false, last4: null, available: false, publishableKey: null }, fetchedAt: 1 };
    const state = reducer({ ...signedIn(), verification }, { type: 'signOut' });
    expect(state.signedIn).toBe(false);
    expect(state.verification).toBe(initialAppState().verification);
    expect(state.verification).toBeNull();
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

describe('the Schedule screen is prefilled on every path (October 25, 2026)', () => {
  const visitor = (): AppState => ({ ...signedIn(), user: { name: 'Mary Ann Lee', firstName: 'Mary Ann', lastName: 'Lee', email: 'mary@example.com', phone: '+13035550100', kind: 'visitor' }, screen: 'explore' });

  it('a property switch that opens Schedule fills the visitor details from the CMS names', () => {
    const next = reducer(visitor(), { type: 'selectProperty', propertyId: 1411, then: 'schedule' });
    expect(next.screen).toBe('schedule');
    expect([next.schedule.first, next.schedule.last, next.schedule.phone]).toEqual(['Mary Ann', 'Lee', '+13035550100']);
    expect(next.scheduleDone).toBe(false);
  });

  it('the same property opening Schedule keeps what was already typed', () => {
    const typed = { ...visitor(), schedule: { ...visitor().schedule, first: 'M', last: '', phone: '' } };
    const next = reducer(typed, { type: 'selectProperty', propertyId: 1618, then: 'schedule' });
    expect([next.schedule.first, next.schedule.last]).toEqual(['M', 'Lee']);
  });

  it('the sign-in gate that lands on Schedule prefills too', () => {
    const gated = { ...visitor(), pendingAfterAuth: 'schedule' as const, authStep: 'confirm' as const };
    const next = reducer(gated, { type: 'confirmProfile' });
    expect(next.screen).toBe('schedule');
    expect(next.schedule.first).toBe('Mary Ann');
  });

  it('without CMS names the display name is split as before', () => {
    const legacy = { ...visitor(), user: { name: 'Pat Smith', email: 'pat@example.com', kind: 'visitor' as const } };
    const next = reducer(legacy, { type: 'selectProperty', propertyId: 1411, then: 'schedule' });
    expect([next.schedule.first, next.schedule.last]).toEqual(['Pat', 'Smith']);
  });
});

describe('the booking lifecycle follows the CMS (October 25, 2026)', () => {
  const tour: ScheduledTour = { id: '25503', status: 'scheduled', date: '2026-10-25', time: '10:00 AM', length: 45, unit: 'No preference', party: 1, source: 'app', createdAt: 0, bookingId: 25503, bookedAtMs: Date.UTC(2026, 9, 25, 17, 0), timeZone: 'America/Vancouver' };
  const withTour = (): AppState => ({ ...signedIn(), scheduledTour: tour });
  const entry = { id: 'h-1', property: 'Hazel', date: 'Today', tags: [] };

  it('a finished tour completes the booking only when the CMS linked the visit to it', () => {
    expect(reducer(withTour(), { type: 'finishTour', entry, pass: null, bookingCompleted: false }).scheduledTour?.status).toBe('scheduled');
    expect(reducer(withTour(), { type: 'finishTour', entry, pass: null }).scheduledTour?.status).toBe('scheduled');
    expect(reducer(withTour(), { type: 'finishTour', entry, pass: null, bookingCompleted: true }).scheduledTour?.status).toBe('past');
  });

  it('the CMS bookings read on resume update, cancel or replace the phone copy', () => {
    const moved = { ...tour, time: '11:00 AM', bookedAtMs: Date.UTC(2026, 9, 25, 18, 0) };
    expect(reducer(withTour(), { type: 'syncBookings', propertyId: 1618, tours: [moved] }).scheduledTour?.time).toBe('11:00 AM');
    expect(reducer(withTour(), { type: 'syncBookings', propertyId: 1618, tours: [{ ...tour, status: 'past' }] }).scheduledTour?.status).toBe('past');
    expect(reducer(withTour(), { type: 'syncBookings', propertyId: 1618, tours: [] }).scheduledTour?.status).toBe('cancelled');
    const checkedIn = { ...withTour(), scheduledTour: { ...tour, status: 'checkedIn' as const } };
    expect(reducer(checkedIn, { type: 'syncBookings', propertyId: 1618, tours: [tour] }).scheduledTour?.status).toBe('checkedIn');
    const another = { ...tour, id: '26000', bookingId: 26000 };
    expect(reducer({ ...withTour(), scheduledTour: { ...tour, status: 'past' as const } }, { type: 'syncBookings', propertyId: 1618, tours: [another] }).scheduledTour?.bookingId).toBe(26000);
    expect(reducer(withTour(), { type: 'syncBookings', propertyId: 1411, tours: [] }).scheduledTour?.status).toBe('scheduled');
    expect(reducer({ ...withTour(), scheduledTour: null }, { type: 'syncBookings', propertyId: 1618, tours: [another] }).scheduledTour?.bookingId).toBe(26000);
  });

  it('a reloaded property prunes a persisted tour that names stops no longer on the list', () => {
    const s = { ...signedIn(), screen: 'stop' as const, selected: { 'unit:1': true, 'unit:9': true } };
    const same = reducer(s, { type: 'bundleLoaded', nodes: ['unit:1', 'unit:2', 'unit:9'] });
    expect(same).toBe(s);
    const pruned = reducer(s, { type: 'bundleLoaded', nodes: ['unit:1', 'amenity:3'] });
    expect(pruned.tourOrder).toEqual(['unit:1']);
    expect(pruned.selected).toEqual({ 'unit:1': true });
    expect(pruned.screen).toBe('home');
    expect(pruned.toast).toMatch(/stops changed/);
    expect(reducer({ ...s, booking: { ...s.booking, fetchedAt: 5 } }, { type: 'bookingStale' }).booking.fetchedAt).toBe(0);
  });
});

describe("the server's ID-verification answer (October 28, 2026)", () => {
  it('is kept for the chosen property only and cleared on a property switch', () => {
    const s = signedIn();
    expect(s.verificationRequired).toBeNull();
    const said = reducer(s, { type: 'verificationRequired', propertyId: 1618, required: false });
    expect(said.verificationRequired).toBe(false);
    expect(reducer(said, { type: 'verificationRequired', propertyId: 1618, required: false })).toBe(said);
    expect(reducer(said, { type: 'verificationRequired', propertyId: 99, required: true }).verificationRequired).toBe(false);
    expect(reducer(said, { type: 'verificationRequired', propertyId: 1618, required: true }).verificationRequired).toBe(true);
    expect(reducer(said, { type: 'selectProperty', propertyId: 2 }).verificationRequired).toBeNull();
  });
});
