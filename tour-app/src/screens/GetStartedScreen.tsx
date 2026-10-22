import { useState, type FormEvent } from 'react';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Eyebrow } from '~/components/ui2';
import { hideKeyboard } from '~/services/native';
import type { AuthStep, PhoneAuthDraft } from '~/store/appState';
import type { TourCardModel } from '~/store/scenarios';
import type { Profile } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  step: AuthStep;
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
  // the visitor sign-in (shown only when the server offers it)
  visitorAuth: boolean;
  phoneAuth: PhoneAuthDraft;
  /** The one-second clock, for the resend countdown. */
  now: number;
  onPhoneSignIn: () => void;
  onStaffSignIn: () => void;
  onPhone: (value: string) => void;
  onSendCode: () => void;
  onCode: (value: string) => void;
  onVerifyCode: () => void;
  onOtpProfile: (field: 'first' | 'last' | 'email', value: string) => void;
  // the confirmation step
  profile: Profile;
  /** A visitor session: the edits go to the CMS profile and the phone cannot be changed here. */
  visitor: boolean;
  editing: boolean;
  tourCard: TourCardModel | null;
  propertyLine: string;
  onEdit: (on: boolean) => void;
  onField: (field: 'first' | 'last' | 'email' | 'phone', value: string) => void;
  onConfirm: () => void;
  mark: string;
}

/**
 * Get Started: the design's sign-in entry. A prospect signs in with their
 * phone number and a one-time code (`POST /visitor/otp`, `/otp/verify`),
 * giving their name and email the first time; Pynwheel staff sign in with
 * the email and password of their CMS account. Then the design's "Does
 * everything look good?" confirmation shows the profile and the state of the
 * visitor's tours. "Continue as Guest" browses demo listings without an account.
 */
export const GetStartedScreen = (p: Props) => {
  // The staff form is tucked away when the phone sign-in is offered; a tap opens it.
  const [staffOpen, setStaffOpen] = useState(false);
  const showStaff = !p.visitorAuth || staffOpen;
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (p.busy) return;
    void hideKeyboard();
    p.onLogin();
  };
  const submitPhone = (e?: FormEvent) => {
    e?.preventDefault();
    if (p.busy) return;
    void hideKeyboard();
    p.onSendCode();
  };
  const submitCode = (e?: FormEvent) => {
    e?.preventDefault();
    if (p.busy) return;
    void hideKeyboard();
    p.onVerifyCode();
  };
  const resendIn = p.phoneAuth.resendAt != null ? Math.max(0, Math.ceil((p.phoneAuth.resendAt - p.now) / 1000)) : 0;
  const error = p.error ? (
    <div className="pw-auth__error" role="alert">
      {p.error}
    </div>
  ) : null;

  const landing = (
    <form className="pw-auth__form" onSubmit={submit} noValidate>
      <div className="pw-auth__intro">
        <div className="pw-auth__title">{p.guest ? 'Sign in to Pynwheel' : 'Welcome to Pynwheel'}</div>
        <div className="pw-auth__sub">{p.visitorAuth ? 'Sign in with your mobile number to book and start self-tours.' : 'Enter the email and password of your Pynwheel account.'}</div>
      </div>
      {p.visitorAuth ? (
        <div className="pw-auth__actions">
          <Button type="button" icon="phone" onClick={p.onPhoneSignIn} disabled={p.busy}>
            Sign in with your phone
          </Button>
          {!showStaff ? (
            <button type="button" className="pw-textlink pw-textlink--muted" onClick={() => setStaffOpen(true)}>
              Staff sign-in
            </button>
          ) : null}
        </div>
      ) : null}
      {showStaff ? (
        <>
          {p.visitorAuth ? <Eyebrow>Staff sign-in</Eyebrow> : null}
          <label className="pw-auth__field">
            <Eyebrow>Email</Eyebrow>
            <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={p.email} onChange={(e) => p.onEmail(e.target.value)} className="pw-input pw-input--lg" aria-label="Email" disabled={p.busy} />
          </label>
          <label className="pw-auth__field">
            <Eyebrow>Password</Eyebrow>
            <input type="password" autoComplete="current-password" placeholder="Password" value={p.password} onChange={(e) => p.onPassword(e.target.value)} className="pw-input pw-input--lg" aria-label="Password" disabled={p.busy} />
          </label>
          {error}
          <div className="pw-auth__actions">
            <Button type="submit" busy={p.busy} variant={p.visitorAuth ? 'secondary' : 'primary'}>
              {p.visitorAuth ? 'Sign in as staff' : 'Continue'}
            </Button>
          </div>
        </>
      ) : null}
      {!p.guest ? (
        <div className="pw-auth__actions">
          <div className="pw-auth__or">
            <span />
            or
            <span />
          </div>
          <Button variant="secondary" height={48} onClick={p.onGuest} type="button">
            Continue as Guest
          </Button>
          <div className="pw-auth__hint">Browse properties now. Sign in later to book and unlock doors.</div>
        </div>
      ) : null}
    </form>
  );

  const phone = (
    <form className="pw-auth__form" onSubmit={submitPhone} noValidate>
      <div className="pw-auth__intro">
        <div className="pw-auth__title">What&rsquo;s your mobile number?</div>
        <div className="pw-auth__sub">We&rsquo;ll text you a 6-digit code to sign in. Standard messaging rates may apply.</div>
      </div>
      <label className="pw-auth__field">
        <Eyebrow>Mobile number</Eyebrow>
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(303) 555-0100" value={p.phoneAuth.phone} onChange={(e) => p.onPhone(e.target.value)} className="pw-input pw-input--lg" aria-label="Mobile number" disabled={p.busy} autoFocus />
      </label>
      {error}
      <div className="pw-auth__actions">
        <Button type="submit" busy={p.busy}>
          Send code
        </Button>
        <button type="button" className="pw-textlink pw-textlink--muted" onClick={p.onStaffSignIn}>
          Staff sign-in
        </button>
      </div>
    </form>
  );

  const code = (
    <form className="pw-auth__form" onSubmit={submitCode} noValidate>
      <div className="pw-auth__intro">
        <div className="pw-auth__title">Enter your code</div>
        <div className="pw-auth__sub">We sent a 6-digit code to {p.phoneAuth.phone.trim() || 'your phone'}.</div>
      </div>
      <label className="pw-auth__field">
        <Eyebrow>Code</Eyebrow>
        <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="123456" value={p.phoneAuth.code} onChange={(e) => p.onCode(e.target.value)} className="pw-input pw-input--lg" aria-label="One-time code" disabled={p.busy} autoFocus />
      </label>
      {error}
      <div className="pw-auth__actions">
        <Button type="submit" busy={p.busy} disabled={p.phoneAuth.code.length !== 6}>
          Continue
        </Button>
        {resendIn > 0 ? (
          <div className="pw-auth__hint" aria-live="polite">
            You can ask for a new code in {resendIn}s.
          </div>
        ) : (
          <button type="button" className="pw-textlink pw-textlink--muted" onClick={p.onSendCode} disabled={p.busy}>
            Resend code
          </button>
        )}
      </div>
    </form>
  );

  const otpProfile = (
    <form className="pw-auth__form" onSubmit={submitCode} noValidate>
      <div className="pw-auth__intro">
        <div className="pw-auth__title">Tell us who you are</div>
        <div className="pw-auth__sub">Your name and email go with your bookings so the leasing team knows who is touring.</div>
      </div>
      {(
        [
          ['first', 'First name', 'given-name', 'text'],
          ['last', 'Last name', 'family-name', 'text'],
          ['email', 'Email', 'email', 'email']
        ] as const
      ).map(([field, label, autoComplete, type]) => (
        <label key={field} className="pw-auth__field">
          <Eyebrow>{label}</Eyebrow>
          <input type={type} inputMode={type === 'email' ? 'email' : 'text'} autoComplete={autoComplete} autoCapitalize={type === 'email' ? 'none' : 'words'} value={p.phoneAuth[field]} onChange={(e) => p.onOtpProfile(field, e.target.value)} className="pw-input pw-input--lg" aria-label={label} disabled={p.busy} />
        </label>
      ))}
      {error}
      <div className="pw-auth__actions">
        <Button type="submit" busy={p.busy}>
          Finish signing in
        </Button>
      </div>
    </form>
  );

  const confirm = (
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
            {p.editing && !(p.visitor && field === 'phone') ? <input value={value} onChange={(e) => p.onField(field, e.target.value)} className="pw-auth__edit" aria-label={label} /> : <span className="pw-auth__value">{value || '—'}</span>}
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
        {p.editing ? <div className="pw-auth__hint">{p.visitor ? 'Your name and email are saved to your Pynwheel visitor profile. The phone number cannot be changed here.' : `Changes stay on this phone. Your Pynwheel account is not updated from the app.${p.mark}`}</div> : null}
      </div>
    </div>
  );

  return (
    <LightShell>
      <div className="pw-auth">
        <div className="pw-auth__top">
          <IconButton icon="back" label="Back" onClick={p.onBack} />
          <img src={logo} alt="Pynwheel Tour" width={150} className="pw-auth__logo" />
          <span />
        </div>
        {p.step === 'confirm' ? confirm : p.step === 'phone' ? phone : p.step === 'code' ? code : p.step === 'profile' ? otpProfile : landing}
        <div className="pw-auth__foot">
          <Icon name="shield" size={13} color="var(--pw-text-subtle)" />
          Your sign-in is checked by Pynwheel. Nothing is shared with the property until you book.
        </div>
      </div>
    </LightShell>
  );
};
