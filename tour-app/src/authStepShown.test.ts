import { describe, expect, it } from 'vitest';
import { authStepShown } from './App';

// Regression for October 23, 2026: before sign-in the step was forced to the
// landing, so the visitor's phone / code / profile steps could never show.
describe('authStepShown', () => {
  it('shows the visitor steps before sign-in and the landing otherwise', () => {
    expect(authStepShown(false, 'phone')).toBe('phone');
    expect(authStepShown(false, 'code')).toBe('code');
    expect(authStepShown(false, 'profile')).toBe('profile');
    expect(authStepShown(false, 'email')).toBe('email');
    expect(authStepShown(false, 'confirm')).toBe('email');
  });
  it('keeps every step once signed in', () => {
    expect(authStepShown(true, 'confirm')).toBe('confirm');
    expect(authStepShown(true, 'email')).toBe('email');
  });
});
