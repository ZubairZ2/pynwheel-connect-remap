import 'server-only';

import { cookies } from 'next/headers';

/**
 * Where the Rails session lives for this app.
 *
 * The browser never sees Rails' own cookie: the Next.js server holds the
 * `Cookie` header it got back from `POST /users/sign_in` and replays it on
 * every server-side call. Nothing about the existing Devise flow changes.
 */
export const SESSION_COOKIE = 'pyn_connect_rails_session';

export const readRailsCookie = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
};

/**
 * `Secure` is on by default in production. A production-mode instance served
 * over plain HTTP (an internal host) must set `PYN_CONNECT_COOKIE_SECURE=false`,
 * or the browser silently drops the cookie and sign-in never sticks.
 */
const secureCookies = (): boolean => {
  const override = process.env.PYN_CONNECT_COOKIE_SECURE;
  if (override != null && override !== '') return override !== 'false';

  return process.env.NODE_ENV === 'production';
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: secureCookies()
} as const;
