import { describe, expect, it } from 'vitest';
import type { VerificationStatus } from '~/repositories/tourRepository';
import { initialAppState, initialVerify, PERSISTED_KEYS, type AppState } from './appState';
import { reducer } from './reducer';
import { isVerified, needsIdVerification } from './scenarios';

/**
 * The ID check's state machine (October 28, 2026): every step forward
 * follows the server's status or the server's reading of CheckpointID's
 * answer; nothing the phone does marks the visitor verified. The pictures
 * live in memory for one attempt and are never restored.
 */

const NOW = 1_800_000_000_000;
const status = (patch: Partial<VerificationStatus> = {}, card: Partial<VerificationStatus['card']> = {}): VerificationStatus => ({
  propertyId: 1618,
  provider: 'check_point_id',
  providerAvailable: true,
  propertyRequires: true,
  required: true,
  state: 'never',
  verifiedAt: null,
  validUntil: null,
  verifiedBy: null,
  validForDays: 30,
  attemptsLeft: 5,
  documentTypes: [
    { key: 'drivers_license', label: "Driver's license", back: true },
    { key: 'passport', label: 'Passport', back: false }
  ],
  card: { required: false, onFile: false, needed: false, last4: null, available: false, publishableKey: null, ...card },
  ...patch
});
const verified = (card: Partial<VerificationStatus['card']> = {}) => status({ required: false, state: 'verified', verifiedAt: '2026-10-28T10:00:00Z', validUntil: '2026-11-27T10:00:00Z', verifiedBy: 'CheckpointID' }, card);
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';

const atProperty = (): AppState => ({ ...initialAppState(), signedIn: true, propertyId: 1618, screen: 'home' });
const opened = (then: 'start' | null = 'start') => reducer(atProperty(), { type: 'openVerify', then });

describe('opening the ID check', () => {
  it('shows the intro and reads the status; a verified visitor is moved straight to Done', () => {
    const s = opened();
    expect(s.screen).toBe('verify');
    expect(s.verify).toMatchObject({ step: 'intro', statusLoading: true, then: 'start', consent: false });
    expect(isVerified(s)).toBe(false);

    const asked = reducer(s, { type: 'verifyStatus', propertyId: 1618, status: status(), now: NOW });
    expect(asked.verify).toMatchObject({ step: 'intro', statusLoading: false, statusError: null });
    expect(asked.verification?.state).toBe('never');
    expect(asked.verificationRequired).toBe(true);
    expect(needsIdVerification(asked)).toBe(true);

    const done = reducer(s, { type: 'verifyStatus', propertyId: 1618, status: verified(), now: NOW });
    expect(done.verify.step).toBe('done');
    expect(done.verificationRequired).toBe(false);
    expect(isVerified(done)).toBe(true);
    expect(needsIdVerification(done)).toBe(false);
    // Verified on the server but the property still wants a card: the card step, not Done.
    expect(reducer(s, { type: 'verifyStatus', propertyId: 1618, status: verified({ required: true, needed: true, available: true, publishableKey: 'pk_test' }), now: NOW }).verify.step).toBe('card');
  });

  it('drops a status for another property and keeps a failed read as an error', () => {
    const s = opened();
    const other = reducer(s, { type: 'verifyStatus', propertyId: 99, status: verified(), now: NOW });
    expect(other.verification).toBeNull();
    expect(other.verify.step).toBe('intro');
    const failed = reducer(s, { type: 'verifyStatusFailed', message: 'offline', unavailable: false });
    expect(failed.verify).toMatchObject({ statusLoading: false, statusError: { message: 'offline', unavailable: false }, step: 'intro' });
    expect(isVerified(failed)).toBe(false);
  });
});

describe('capturing the pictures', () => {
  const ready = () => reducer(reducer(opened(), { type: 'verifyStatus', propertyId: 1618, status: status(), now: NOW }), { type: 'verifyConsent' });

  it("walks front → back → selfie for a driver's licence and front → selfie for a passport", () => {
    let s = reducer(ready(), { type: 'verifyStep', step: 'document' });
    s = reducer(s, { type: 'verifyDocumentType', documentType: 'drivers_license' });
    expect(s.verify.step).toBe('front');
    s = reducer(s, { type: 'verifyCaptured', kind: 'front', image: IMG });
    expect(s.verify.step).toBe('back');
    s = reducer(s, { type: 'verifyCaptured', kind: 'back', image: IMG });
    expect(s.verify.step).toBe('selfie');
    s = reducer(s, { type: 'verifyRetake', kind: 'front' });
    expect(s.verify).toMatchObject({ step: 'front', images: { front: null, back: IMG, selfie: null } });

    let passport = reducer(ready(), { type: 'verifyDocumentType', documentType: 'passport' });
    passport = reducer(passport, { type: 'verifyCaptured', kind: 'front', image: IMG });
    expect(passport.verify.step).toBe('selfie');
    expect(passport.verify.images.back).toBeNull();
  });

  it('never marks the visitor verified from a capture, a step or a local flag', () => {
    let s = reducer(ready(), { type: 'verifyDocumentType', documentType: 'passport' });
    s = reducer(s, { type: 'verifyCaptured', kind: 'front', image: IMG });
    s = reducer(s, { type: 'verifyCaptured', kind: 'selfie', image: IMG });
    s = reducer(s, { type: 'verifySubmitting' });
    expect(s.verify.step).toBe('submitting');
    expect(isVerified(s)).toBe(false);
    expect(needsIdVerification(s)).toBe(true);
    // Even a step forced to Done leaves the server's status as it was: never verified.
    expect(reducer(s, { type: 'verifyStep', step: 'done' }).verification?.state).toBe('never');
    expect(isVerified(reducer(s, { type: 'verifyStep', step: 'done' }))).toBe(false);
  });
});

describe("the server's answer", () => {
  const submitting = () => {
    let s = reducer(reducer(opened(), { type: 'verifyStatus', propertyId: 1618, status: status(), now: NOW }), { type: 'verifyDocumentType', documentType: 'passport' });
    s = reducer(s, { type: 'verifyCaptured', kind: 'front', image: IMG });
    s = reducer(s, { type: 'verifyCaptured', kind: 'selfie', image: IMG });
    return reducer(s, { type: 'verifySubmitting' });
  };

  it('a pass moves to Done (or to the card) and the status is the server one; the pictures are dropped', () => {
    const s = reducer(submitting(), { type: 'verifyResult', propertyId: 1618, outcome: 'verified', reason: null, status: verified(), now: NOW });
    expect(s.verify.step).toBe('done');
    expect(s.verify.images).toEqual({ front: null, back: null, selfie: null });
    expect(s.verification).toMatchObject({ state: 'verified', verifiedBy: 'CheckpointID', fetchedAt: NOW });
    expect(s.verificationRequired).toBe(false);
    expect(isVerified(s)).toBe(true);
    const card = reducer(submitting(), { type: 'verifyResult', propertyId: 1618, outcome: 'verified', reason: null, status: verified({ required: true, needed: true, available: true, publishableKey: 'pk_test' }), now: NOW });
    expect(card.verify.step).toBe('card');
    expect(needsIdVerification(card)).toBe(false);
  });

  it('a mismatch, an unreadable document or a rejection shows the reason and stays unverified, counting attempts', () => {
    const s = reducer(submitting(), { type: 'verifyResult', propertyId: 1618, outcome: 'face_mismatch', reason: 'The Face has not been matched', status: status({ attemptsLeft: 4 }), now: NOW });
    expect(s.verify.step).toBe('result');
    expect(s.verify.result).toEqual({ outcome: 'face_mismatch', reason: 'The Face has not been matched' });
    expect(s.verify.images).toEqual({ front: null, back: null, selfie: null });
    expect(s.verification?.attemptsLeft).toBe(4);
    expect(isVerified(s)).toBe(false);
    expect(needsIdVerification(s)).toBe(true);
    // Scan again: a new document choice starts a clean capture.
    const again = reducer(s, { type: 'verifyDocumentType', documentType: 'drivers_license' });
    expect(again.verify).toMatchObject({ step: 'front', result: null, error: null });
  });

  it('a failure to run keeps the pictures for a retry when retryable, drops them otherwise', () => {
    const down = reducer(submitting(), { type: 'verifyFailed', code: 'provider_unavailable', message: 'down', retryable: true });
    expect(down.verify.step).toBe('result');
    expect(down.verify.error).toEqual({ code: 'provider_unavailable', message: 'down', retryable: true });
    expect(down.verify.images.front).toBe(IMG);
    const limit = reducer(submitting(), { type: 'verifyFailed', code: 'attempt_limit', message: 'wait', retryable: false });
    expect(limit.verify.images.front).toBeNull();
    // A status read after a lost request that finds the server verified moves on; one that does not leaves the error.
    expect(reducer(down, { type: 'verifyStatus', propertyId: 1618, status: verified(), now: NOW }).verify.step).toBe('done');
    expect(reducer(down, { type: 'verifyStatus', propertyId: 1618, status: status({ attemptsLeft: 4 }), now: NOW }).verify.step).toBe('result');
  });

  it('the card step saves through the server and only its status finishes the flow', () => {
    const card = reducer(submitting(), { type: 'verifyResult', propertyId: 1618, outcome: 'verified', reason: null, status: verified({ required: true, needed: true, available: true, publishableKey: 'pk_test' }), now: NOW });
    const saving = reducer(card, { type: 'verifyCardSaving' });
    expect(saving.verify.cardSaving).toBe(true);
    const failed = reducer(saving, { type: 'verifyCardFailed', message: 'declined' });
    expect(failed.verify).toMatchObject({ cardSaving: false, cardError: 'declined', step: 'card' });
    const saved = reducer(saving, { type: 'verifyCardSaved', propertyId: 1618, status: verified({ required: true, needed: false, onFile: true, last4: '4242', available: true }), now: NOW });
    expect(saved.verify.step).toBe('done');
    expect(saved.verification?.card).toMatchObject({ onFile: true, last4: '4242' });
    // The server still wants a card (the save did not stick): the card step stays.
    expect(reducer(saving, { type: 'verifyCardSaved', propertyId: 1618, status: verified({ required: true, needed: true, available: true, publishableKey: 'pk' }), now: NOW }).verify.step).toBe('card');
  });

  it('finishing clears the flow; a property switch, sign-out and hydration never carry pictures or another property\'s status', () => {
    const done = reducer(submitting(), { type: 'verifyResult', propertyId: 1618, outcome: 'verified', reason: null, status: verified(), now: NOW });
    const finished = reducer(done, { type: 'verifyFinish' });
    expect(finished.screen).toBe('home');
    expect(finished.verify).toEqual(initialVerify());
    expect(finished.verification?.state).toBe('verified');
    expect(reducer(finished, { type: 'selectProperty', propertyId: 2 }).verification).toBeNull();
    expect(reducer(finished, { type: 'signOut' }).verification).toBeNull();
    const mid = submitting();
    const hydrated = reducer(initialAppState(), { type: 'hydrate', state: { verification: finished.verification, verify: mid.verify } as never });
    expect(hydrated.verify).toEqual(initialVerify());
    expect(hydrated.verification?.state).toBe('verified');
    expect(PERSISTED_KEYS).toContain('verification');
    expect(PERSISTED_KEYS).not.toContain('verify');
  });

  it('the demo switch still stands in for verification, and only it', () => {
    const s = opened();
    expect(isVerified({ ...s, demo: { ...s.demo, idVerified: true } })).toBe(true);
    expect(needsIdVerification({ ...s, demo: { ...s.demo, idVerified: true }, verificationRequired: true })).toBe(false);
    expect(isVerified({ ...s, verification: { ...verified(), state: 'expired', fetchedAt: NOW } })).toBe(false);
  });
});
