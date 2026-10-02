'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { CurrentUser } from '~/core/models/data/session.data';

/**
 * The signed-in user, read once by the shell's server layout
 * (`loadCurrentUser`) and shared with the client chrome that names them:
 * the top bar's profile block. Nothing here fetches; the Rails session cookie
 * is still what authenticates every request.
 */
const CurrentUserContext = createContext<CurrentUser | null>(null);

export const CurrentUserProvider = ({ user, children }: { user: CurrentUser | null; children: ReactNode }) => (
  <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
);

export const useCurrentUser = (): CurrentUser | null => useContext(CurrentUserContext);
