import 'server-only';

import { cookies } from 'next/headers';

import type { CurrentUser } from '~/core/models/data/session.data';
import { readRailsCookie } from './session.server';

/**
 * Who is signed in, for the sidebar.
 *
 * The legacy CMS has no "current user" endpoint, and adding one is outside this
 * phase's scope, so the sign-in route handler stores the `meta.current_user`
 * block Rails already returns with every listing. The Rails session cookie
 * remains the only thing that actually authenticates a request.
 */
export const USER_COOKIE = 'pyn_connect_user';

export const loadCurrentUser = async (): Promise<CurrentUser | null> => {
  const railsCookie = await readRailsCookie();
  if (!railsCookie) return null;

  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
};
