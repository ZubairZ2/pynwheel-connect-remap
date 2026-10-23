import { describe, expect, it } from 'vitest';
import type { LockPin } from '~/models';
import { PERSISTED_KEYS, initialAppState, type AppState, type VisitState } from './appState';
import { reducer } from './reducer';
import { tourFromBooking } from './useAppActions';
import { profileOf } from './views';
import { syncableVisit, visitRecording } from './visitSync';

/**
 * The visitor sign-in's state machine (phone → code → profile → signed in),
 * the visit the CMS records (persisted, started offline, ended), the door
 * codes that must not outlive the access window, and a visitor's profile.
 */

const NOW = 1_780_000_000_000;

describe('signing in with a phone', () => {
  it('walks phone → code → signed in, with the resend timer and the confirmation', () => {
    let state = reducer(initialAppState(), { type: 'setCapabilities', capabilities: { visits: true, visitorAuth: true } });
    state = reducer(state, { type: 'authStep', step: 'phone' });
    expect(state.authStep).toBe('phone');
    state = reducer(state, { type: 'setPhone', value: '(303) 555-0100' });
    state = reducer(state, { type: 'loginStart' });
    expect(state.auth.status).toBe('busy');
    state = reducer(state, { type: 'otpSent', resendAt: NOW + 60000 });
    expect(state).toMatchObject({ authStep: 'code', auth: { status: 'idle', error: null }, phoneAuth: { phone: '(303) 555-0100', code: '', resendAt: NOW + 60000 } });
    state = reducer(state, { type: 'setOtpCode', value: '12-34-56-789' });
    expect(state.phoneAuth.code).toBe('123456');
    state = reducer(state, { type: 'loginFailed', message: 'That code is not valid. Ask for a new one.' });
    expect(state.auth).toEqual({ status: 'error', error: 'That code is not valid. Ask for a new one.' });
    // Typing again clears the error; the visitor may retry or resend.
    state = reducer(state, { type: 'setOtpCode', value: '654321' });
    expect(state.auth.status).toBe('idle');
    state = reducer(state, { type: 'loginSucceeded', user: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+13035550100', kind: 'visitor' }, propertyId: 1618 });
    expect(state).toMatchObject({ screen: 'getStarted', authStep: 'confirm', signedIn: true, guest: false, propertyId: 1618, user: { kind: 'visitor', phone: '+13035550100' } });
    expect(state.phoneAuth.code).toBe('');
    expect(profileOf(state, null)).toEqual({ first: 'Ada', last: 'Lovelace', email: 'ada@example.com', phone: '+13035550100', initial: 'A' });
    const home = reducer(state, { type: 'confirmProfile' });
    expect(home.screen).toBe('home');
  });

  it('a new visitor is asked for a profile and finishes from there; Back walks the steps down', () => {
    let state = reducer(initialAppState(), { type: 'authStep', step: 'phone' });
    state = reducer(state, { type: 'otpSent', resendAt: NOW + 60000 });
    state = reducer(state, { type: 'setOtpCode', value: '123456' });
    state = reducer(state, { type: 'otpProfileRequired' });
    expect(state.authStep).toBe('profile');
    expect(state.phoneAuth.code).toBe('123456'); // the same code is sent again with the profile
    state = reducer(state, { type: 'setOtpProfile', field: 'first', value: 'Ada' });
    state = reducer(state, { type: 'setOtpProfile', field: 'last', value: 'Lovelace' });
    state = reducer(state, { type: 'setOtpProfile', field: 'email', value: 'ada@example.com' });
    expect(state.phoneAuth).toMatchObject({ first: 'Ada', last: 'Lovelace', email: 'ada@example.com' });
    const back = reducer(state, { type: 'authBack' });
    expect(back.authStep).toBe('phone');
    expect(back.phoneAuth.code).toBe('');
    expect(reducer(back, { type: 'authBack' }).authStep).toBe('email');
    expect(reducer(reducer(back, { type: 'authBack' }), { type: 'authBack' }).screen).toBe('onboarding');
  });

  it('a visitor\'s saved profile replaces the local edits; capabilities survive sign-out and the phone draft never persists', () => {
    let state = reducer(initialAppState(), { type: 'loginSucceeded', user: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1', kind: 'visitor' }, propertyId: 1 });
    state = reducer(state, { type: 'setProfileField', field: 'last', value: 'King' });
    expect(profileOf(state, null).last).toBe('King');
    state = reducer(state, { type: 'setUser', user: { name: 'Ada King', email: 'ada@example.com', phone: '+1', kind: 'visitor' } });
    expect(state.profileEdits).toEqual({});
    expect(profileOf(state, null)).toMatchObject({ first: 'Ada', last: 'King' });
    const caps = reducer(state, { type: 'setCapabilities', capabilities: { visits: true, visitorAuth: true } });
    expect(reducer(caps, { type: 'signOut' }).capabilities).toEqual({ visits: true, visitorAuth: true });
    expect(reducer(caps, { type: 'sessionExpired', message: 'Please sign in again.' })).toMatchObject({ capabilities: { visits: true, visitorAuth: true }, toast: 'Please sign in again.', signedIn: false });
    expect(PERSISTED_KEYS).toContain('capabilities');
    expect(PERSISTED_KEYS).not.toContain('phoneAuth');
    const hydrated = reducer({ ...initialAppState(), phoneAuth: { ...caps.phoneAuth, code: '123456' } }, { type: 'hydrate', state: caps });
    expect(hydrated.phoneAuth.code).toBe('');
    expect(hydrated.capabilities.visitorAuth).toBe(true);
  });

  it('the CMS\'s booking becomes the Home card unless a live one is already there', () => {
    const tour = tourFromBooking({ id: 501, propertyId: 1618, propertyName: 'Hazel', status: 'upcoming', date: '2026-10-24', time: '18:00', timeLabel: '6:00 PM', endTime: '18:45', tourType: 'self_tour', createdBy: 'tour_app' }, NOW);
    expect(tour).toMatchObject({ id: '501', status: 'scheduled', date: '2026-10-24', time: '6:00 PM', source: 'app', bookingId: 501, tourType: 'self_tour' });
    expect(tourFromBooking({ ...{ id: 1, propertyId: 1, propertyName: null, date: null, time: null, timeLabel: null, endTime: null, tourType: null, createdBy: 'widget' }, status: 'completed' }, NOW)).toMatchObject({ status: 'past', source: 'website' });
    const adopted = reducer(initialAppState(), { type: 'adoptBooking', tour });
    expect(adopted.scheduledTour).toEqual(tour);
    const other = { ...tour, id: '9', bookingId: 9 };
    expect(reducer(adopted, { type: 'adoptBooking', tour: other }).scheduledTour).toEqual(tour);
    expect(reducer({ ...adopted, scheduledTour: { ...tour, status: 'cancelled' } }, { type: 'adoptBooking', tour: other }).scheduledTour).toEqual(other);
  });
});

const visit: VisitState = { clientVisitId: 'c0ffee00-0000-4000-8000-000000000001', propertyId: 1618, id: null, status: 'active', tourType: 'self_tour', startedAt: '2026-10-24T18:00:00Z', bookingId: 501, tourUserId: null, end: null };
const signedIn = (): AppState => ({ ...initialAppState(), signedIn: true, user: { name: 'Ada', email: 'a@b.c', kind: 'visitor' }, propertyId: 1618, screen: 'home' });

describe('the recorded visit', () => {
  it('is kept from check-in (offline, with its client id) until the CMS answers, then carries the server access window', () => {
    let state = reducer(signedIn(), { type: 'checkIn', now: NOW, accessMs: 45 * 60000, visit });
    expect(state.visit).toEqual(visit);
    expect(state.checkedIn).toBe(true);
    expect(PERSISTED_KEYS).toContain('visit');
    expect(visitRecording(state.visit)).toBe(true);
    expect(syncableVisit(state)).toEqual(visit);
    state = reducer(state, { type: 'visitStarted', clientVisitId: visit.clientVisitId, id: 77, accessEndsAt: NOW + 30 * 60000 });
    expect(state.visit).toMatchObject({ id: 77, status: 'active' });
    expect(state.accessEndsAt).toBe(NOW + 30 * 60000);
    // An answer for another check-in is ignored.
    expect(reducer(state, { type: 'visitStarted', clientVisitId: 'other', id: 1, accessEndsAt: null })).toBe(state);
  });

  it('ends once the visitor finished and is forgotten once the CMS took the end; a refusal for good makes it phone-only', () => {
    let state = reducer(signedIn(), { type: 'checkIn', now: NOW, accessMs: 1, visit: { ...visit, id: 77 } });
    const end = { endedAt: '2026-10-24T18:40:00Z', reason: 'completed' as const, abandonedAtStop: null };
    state = reducer(state, { type: 'visitEnding', clientVisitId: visit.clientVisitId, end });
    expect(state.visit).toMatchObject({ status: 'ended', end });
    expect(visitRecording(state.visit)).toBe(false); // no more events after the end
    expect(syncableVisit(state)).not.toBeNull(); // but the end itself still has to be sent
    expect(reducer(state, { type: 'visitClosed', clientVisitId: visit.clientVisitId }).visit).toBeNull();
    const local = reducer(reducer(signedIn(), { type: 'checkIn', now: NOW, accessMs: 1, visit }), { type: 'visitLocal', clientVisitId: visit.clientVisitId });
    expect(local.visit?.status).toBe('local');
    expect(visitRecording(local.visit)).toBe(false);
    expect(syncableVisit(local)).toBeNull();
    expect(syncableVisit({ ...local, signedIn: false, visit })).toBeNull();
  });

  it('a check-in without a visit (demo data, a forced scenario) records nothing', () => {
    const state = reducer(signedIn(), { type: 'checkIn', now: NOW, accessMs: 1 });
    expect(state.visit).toBeNull();
    expect(visitRecording(state.visit)).toBe(false);
  });
});

describe('door codes and the access window', () => {
  const pin: LockPin = { pin: '221673337', validFrom: null, validUntil: null, issuedAt: 1 };

  it('are dropped on relaunch once the access window has passed, kept while it is open', () => {
    const open = reducer(initialAppState(), { type: 'hydrate', state: { ...signedIn(), checkedIn: true, accessEndsAt: Date.now() + 60000, lockPins: { 'unit:1': pin } } });
    expect(open.lockPins['unit:1']).toEqual(pin);
    expect(open.checkedIn).toBe(true);
    const over = reducer(initialAppState(), { type: 'hydrate', state: { ...signedIn(), checkedIn: true, accessEndsAt: Date.now() - 1, lockPins: { 'unit:1': pin } } });
    expect(over.lockPins).toEqual({});
    expect(over.checkedIn).toBe(false);
  });
});

describe('otpSent debug code (testing servers only)', () => {
  it('keeps the disclosed code for the code step and drops it when absent', () => {
    const base = initialAppState();
    const withCode = reducer(base, { type: 'otpSent', resendAt: 1, debugCode: '123456' });
    expect(withCode.authStep).toBe('code');
    expect(withCode.phoneAuth.debugCode).toBe('123456');
    const without = reducer(withCode, { type: 'otpSent', resendAt: 2 });
    expect(without.phoneAuth.debugCode).toBeNull();
  });
});
