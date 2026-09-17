import { NextResponse } from 'next/server';

import { postSignOut } from '~/core/repository/remote/api/auth.api';
import { readRailsCookie, SESSION_COOKIE, sessionCookieOptions } from '~/core/session/session.server';
import { USER_COOKIE } from '~/core/session/currentUser.server';

/** Ends the Devise session upstream, then drops this app's cookies. */
export async function POST(): Promise<NextResponse> {
  const cookie = await readRailsCookie();
  if (cookie) await postSignOut(cookie);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  response.cookies.set(USER_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });

  return response;
}
