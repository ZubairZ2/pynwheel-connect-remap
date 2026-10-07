import { useState, type FormEvent } from 'react';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { Button } from '~/components/ui';
import { hideKeyboard } from '~/services/native';
import { LightShell } from './shared';

interface Props {
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
}

/**
 * Sign in, as the reference: any email and password proceed (no backend in
 * this phase). Empty fields are refused with an inline message so the form
 * still behaves like a real one.
 */
export const LoginScreen = ({ email, password, onEmail, onPassword, onLogin }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That email address does not look right.');
      return;
    }
    setError(null);
    setBusy(true);
    void hideKeyboard();
    window.setTimeout(() => {
      setBusy(false);
      onLogin();
    }, 500);
  };

  return (
    <LightShell>
      <form className="pw-login" onSubmit={submit} noValidate>
        <img src={logo} alt="Pynwheel Tour" width={220} className="pw-login__logo" />
        <div className="pw-login__text">
          <div className="pw-login__title">Welcome Back</div>
          <div className="pw-login__sub">Sign in to manage your tours.</div>
        </div>
        <div className="pw-login__fields">
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => onEmail(e.target.value)} className="pw-input" aria-label="Email" />
          <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => onPassword(e.target.value)} className="pw-input" aria-label="Password" />
          {error ? (
            <div className="pw-login__error" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" style={{ marginTop: 6 }} busy={busy}>
            Login
          </Button>
        </div>
      </form>
    </LightShell>
  );
};
