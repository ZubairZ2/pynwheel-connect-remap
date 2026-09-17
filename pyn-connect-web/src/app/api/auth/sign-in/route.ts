import { NextResponse } from 'next/server';

import {
  extractFlashMessage,
  fetchFlashMessage,
  fetchSignInPage,
  postSignIn
} from '~/core/repository/remote/api/auth.api';
import { fetchCompanies } from '~/core/repository/remote/api/companies.api';
import { parseListingMeta } from '~/core/repository/parser/envelope.parser';
import { SESSION_COOKIE, sessionCookieOptions } from '~/core/session/session.server';
import { USER_COOKIE } from '~/core/session/currentUser.server';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { SignInResult } from '~/core/models/data/session.data';

/**
 * Sign In, against the existing Devise flow — no new authentication system.
 *
 *  1. read the CSRF token from the existing login page
 *  2. POST the same form parameters the HAML form posts
 *  3. confirm the session really is signed in (Users::SessionsController#create
 *     signs the user back out when `pynwheel_connect_access` is false, and
 *     still redirects), then keep the Rails cookie server-side
 */
export async function POST(request: Request): Promise<NextResponse<SignInResult>> {
  let payload: { email?: string; password?: string; rememberMe?: boolean };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: i18n.t(CORE_STRINGS.signIn.genericError) }, { status: 400 });
  }

  const email = (payload.email ?? '').trim();
  const password = payload.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: i18n.t(CORE_STRINGS.signIn.genericError) }, { status: 400 });
  }

  const { token, cookie } = await fetchSignInPage();
  const attempt = await postSignIn({
    email,
    password,
    rememberMe: Boolean(payload.rememberMe),
    token,
    cookie
  });

  // Devise re-renders the form (200) when the credentials are wrong; the flash
  // is in that response body.
  if (!attempt.redirected) {
    return NextResponse.json(
      {
        ok: false,
        error: extractFlashMessage(attempt.html) ?? i18n.t(CORE_STRINGS.signIn.genericError)
      },
      { status: 401 }
    );
  }

  const verification = await fetchCompanies(attempt.cookie);

  if (!verification.ok) {
    const flash = await fetchFlashMessage(attempt.cookie);
    return NextResponse.json(
      { ok: false, error: flash ?? i18n.t(CORE_STRINGS.signIn.genericError) },
      { status: 401 }
    );
  }

  const currentUser = parseListingMeta(verification.body).currentUser;

  const response = NextResponse.json<SignInResult>({ ok: true, currentUser });
  response.cookies.set(SESSION_COOKIE, attempt.cookie, sessionCookieOptions);
  response.cookies.set(USER_COOKIE, JSON.stringify(currentUser ?? {}), sessionCookieOptions);

  return response;
}
