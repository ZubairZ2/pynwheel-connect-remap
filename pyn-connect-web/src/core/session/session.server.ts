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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production'
} as const;
