import type { FormEvent } from 'react';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Eyebrow } from '~/components/ui2';
import { hideKeyboard } from '~/services/native';
import type { TourCardModel } from '~/store/scenarios';
import type { Profile } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  step: 'email' | 'confirm';
  /** Sign-in state: the visitor had chosen guest mode, or is signing in to pick up an action. */
  guest: boolean;
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
  onBack: () => void;
  onGuest: () => void;
  // the confirmation step
  profile: Profile;
  editing: boolean;
  tourCard: TourCardModel | null;
  propertyLine: string;
  onEdit: (on: boolean) => void;
  onField: (field: 'first' | 'last' | 'email' | 'phone', value: string) => void;
  onConfirm: () => void;
  mark: string;
}

/**
 * Get Started: the design's sign-in entry. The Pynwheel backend signs in with
 * email and password (the design's phone / one-time-code path has no backend
 * in this phase and is not simulated), then the design's "Does everything look
 * good?" confirmation shows the profile and the state of the visitor's tours.
 * "Continue as Guest" browses demo listings without an account.
 */
export const GetStartedScreen = (p: Props) => {
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (p.busy) return;
    void hideKeyboard();
    p.onLogin();
  };

  return (
    <LightShell>
      <div className="pw-auth">
        <div className="pw-auth__top">
          <IconButton icon="back" label="Back" onClick={p.onBack} />
          <img src={logo} alt="Pynwheel Tour" width={150} className="pw-auth__logo" />
          <span />
        </div>

        {p.step === 'email' ? (
          <form className="pw-auth__form" onSubmit={submit} noValidate>
            <div className="pw-auth__intro">
              <div className="pw-auth__title">{p.guest ? 'Sign in to Pynwheel' : 'Welcome to Pynwheel'}</div>
              <div className="pw-auth__sub">Enter the email and password of your Pynwheel account.</div>
            </div>
            <label className="pw-auth__field">
              <Eyebrow>Email</Eyebrow>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={p.email} onChange={(e) => p.onEmail(e.target.value)} className="pw-input pw-input--lg" aria-label="Email" disabled={p.busy} />
            </label>
            <label className="pw-auth__field">
              <Eyebrow>Password</Eyebrow>
              <input type="password" autoComplete="current-password" placeholder="Password" value={p.password} onChange={(e) => p.onPassword(e.target.value)} className="pw-input pw-input--lg" aria-label="Password" disabled={p.busy} />
            </label>
            {p.error ? (
              <div className="pw-auth__error" role="alert">
                {p.error}
              </div>
            ) : null}
            <div className="pw-auth__actions">
              <Button type="submit" busy={p.busy}>
                Continue
              </Button>
              {!p.guest ? (
                <>
                  <div className="pw-auth__or">
                    <span />
                    or
                    <span />
                  </div>
                  <Button variant="secondary" height={48} onClick={p.onGuest} type="button">
                    Continue as Guest
                  </Button>
                  <div className="pw-auth__hint">Browse properties now. Sign in later to book and unlock doors.</div>
                </>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="pw-auth__form">
            <div className="pw-auth__intro">
              <div className="pw-auth__title">Does everything look good?</div>
              <div className="pw-auth__sub">We matched your sign-in to this profile.</div>
            </div>
            <div className="pw-auth__card">
              {(
                [
                  ['first', 'First name', p.profile.first],
                  ['last', 'Last name', p.profile.last],
                  ['email', 'Email', p.profile.email],
                  ['phone', 'Phone', p.profile.phone]
                ] as const
              ).map(([field, label, value]) => (
                <div key={field} className="pw-auth__row">
                  <Eyebrow>{label}</Eyebrow>
                  {p.editing ? <input value={value} onChange={(e) => p.onField(field, e.target.value)} className="pw-auth__edit" aria-label={label} /> : <span className="pw-auth__value">{value || '—'}</span>}
                </div>
              ))}
              <div className="pw-auth__tours">
                <Eyebrow>{p.tourCard ? p.tourCard.label : 'Tours'}</Eyebrow>
                {p.tourCard ? (
                  <>
                    <div className={`pw-auth__tourtitle${p.tourCard.tone === 'muted' || p.tourCard.scenario === 'missed' || p.tourCard.scenario === 'cancelled' ? ' pw-auth__tourtitle--dim' : ''}`}>{p.tourCard.confirmTitle}</div>
                    <div className="pw-auth__toursub">{p.propertyLine}</div>
                    <span className={`pw-auth__pill pw-auth__pill--${p.tourCard.pillTone}`}>
                      {p.tourCard.pill}
                      {p.mark}
                    </span>
                    {p.tourCard.confirmNote ? <div className="pw-auth__tournote">{p.tourCard.confirmNote}</div> : null}
                  </>
                ) : (
                  <>
                    <div className="pw-auth__tourtitle">No tours yet</div>
                    <div className="pw-auth__toursub">You can book a self-tour from Home after you continue.</div>
                  </>
                )}
              </div>
            </div>
            <div className="pw-auth__actions">
              {p.editing ? (
                <Button onClick={() => p.onEdit(false)}>Save changes</Button>
              ) : (
                <>
                  <Button onClick={p.onConfirm}>Everything looks good</Button>
                  <Button variant="secondary" style={{ fontSize: 15 }} onClick={() => p.onEdit(true)}>
                    I need to change something
                  </Button>
                </>
              )}
              {p.editing ? <div className="pw-auth__hint">Changes stay on this phone. Your Pynwheel account is not updated from the app.{p.mark}</div> : null}
            </div>
          </div>
        )}
        <div className="pw-auth__foot">
          <Icon name="shield" size={13} color="var(--pw-text-subtle)" />
          Your sign-in is checked by Pynwheel. Nothing is shared with the property until you book.
        </div>
      </div>
    </LightShell>
  );
};
