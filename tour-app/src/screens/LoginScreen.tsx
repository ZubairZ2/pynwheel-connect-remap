import type { FormEvent } from 'react';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { Button } from '~/components/ui';
import { hideKeyboard } from '~/services/native';
import { LightShell } from './shared';

interface Props {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
}

/**
 * Sign in with Pynwheel CMS credentials. The repository verifies them
 * through the Tour App API (only Super Admins are admitted); the error the
 * backend gives is shown inline.
 */
export const LoginScreen = ({ email, password, busy, error, onEmail, onPassword, onLogin }: Props) => {
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    void hideKeyboard();
    onLogin();
  };

  return (
    <LightShell>
      <form className="pw-login" onSubmit={submit} noValidate>
        <img src={logo} alt="Pynwheel Tour" width={220} className="pw-login__logo" />
        <div className="pw-login__text">
          <div className="pw-login__title">Welcome Back</div>
          <div className="pw-login__sub">Sign in with your Pynwheel account.</div>
        </div>
        <div className="pw-login__fields">
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => onEmail(e.target.value)} className="pw-input" aria-label="Email" disabled={busy} />
          <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => onPassword(e.target.value)} className="pw-input" aria-label="Password" disabled={busy} />
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
