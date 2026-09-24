'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { SignInResult } from '~/core/models/data/session.data';

/** The three product cards from the design, with its own imagery and alt text. */
const PRODUCTS = [
  {
    label: 'Pynwheel Touch',
    src: '/images/product-touch.png',
    alt: 'A leasing associate using a Pynwheel Touch kiosk'
  },
  {
    label: 'Pynwheel Map',
    src: '/images/product-map.png',
    alt: 'A renter browsing a property map on a laptop'
  },
  {
    label: 'Pynwheel Tour',
    src: '/images/product-tour.png',
    alt: 'A renter on a self-guided tour using her phone'
  }
];

/**
 * Sign In. The submit posts to this app's route handler, which drives the
 * existing Devise `Users::SessionsController` server-side — same parameters,
 * same session, same error messages.
 */
export const SignInScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const result = (await response.json()) as SignInResult;

      if (result.ok) {
        router.replace(APP_ROUTES.properties);
        router.refresh();
        return;
      }

      setError(result.error ?? i18n.t(CORE_STRINGS.signIn.genericError));
    } catch {
      setError(i18n.t(CORE_STRINGS.signIn.genericError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bo-auth">
      <aside className="bo-auth__aside">
        <div className="bo-auth__brand">
          <Image
            src="/images/pynwheel-connect-logo.png"
            alt="Pynwheel Connect"
            width={266}
            height={62}
            priority
            className="bo-auth__logo"
          />
          <span className="bo-auth__chip">PLATFORM</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="bo-auth__headline">{i18n.t(CORE_STRINGS.signIn.marketingTitle)}</div>
          <p className="bo-auth__body">{i18n.t(CORE_STRINGS.signIn.marketingBody)}</p>
          <div className="bo-auth__products">
            {PRODUCTS.map((product) => (
              <figure key={product.label} className="bo-auth__product">
                <Image
                  src={product.src}
                  alt={product.alt}
                  width={450}
                  height={450}
                  className="bo-auth__product-image"
                />
                <figcaption className="bo-auth__product-label">{product.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="bo-auth__footer">© {new Date().getFullYear()} Pynwheel, Inc</div>
      </aside>

      <section className="bo-auth__panel">
        <form className="bo-auth__form" onSubmit={onSubmit} noValidate>
          <div>
            <h1 className="bo-auth__title">{i18n.t(CORE_STRINGS.signIn.title)}</h1>
            <p className="bo-auth__subtitle">{i18n.t(CORE_STRINGS.signIn.subtitle)}</p>
          </div>

          {error && (
            <div className="bo-error" role="alert">
              {error}
            </div>
          )}

          <div className="bo-auth__fields">
            <label className="bo-auth__field bo-label">
              {i18n.t(CORE_STRINGS.signIn.email)}
              <input
                className="bo-field"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@pynwheel.com"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="bo-auth__field bo-label">
              {i18n.t(CORE_STRINGS.signIn.password)}
              <input
                className="bo-field"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <div className="bo-auth__row">
              <label className="bo-auth__remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                {i18n.t(CORE_STRINGS.signIn.remember)}
              </label>
              <a
                className="bo-auth__link"
                href={`${process.env.NEXT_PUBLIC_CMS_URL ?? ''}/users/password/new`}
              >
                {i18n.t(CORE_STRINGS.signIn.forgot)}
              </a>
            </div>

            <button className="bo-button" type="submit" disabled={submitting}>
              {submitting ? i18n.t(CORE_STRINGS.signIn.submitting) : i18n.t(CORE_STRINGS.signIn.submit)}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
