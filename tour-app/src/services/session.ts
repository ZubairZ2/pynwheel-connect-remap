import { Preferences } from '@capacitor/preferences';

/**
 * The signed-in session: the API token, who is signed in and which property
 * is selected. Stored with `@capacitor/preferences` (UserDefaults / Shared
 * Preferences / localStorage), separately from the UI state, so a relaunch
 * restores the session and signing out removes exactly this.
 *
 * Note: Preferences is not an encrypted store. Moving the token to the
 * Keychain / Keystore means swapping the two calls below for a secure
 * storage plugin; nothing else reads the token directly.
 */

const KEY = 'pynwheel_tour_session_v1';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Session {
  accessToken: string;
  expiresAt: string | null;
  user: SessionUser;
  propertyId: number | null;
}

export const loadSession = async (): Promise<Session | null> => {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Session>;
    if (!parsed || typeof parsed.accessToken !== 'string' || !parsed.user) return null;
    return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt ?? null, user: parsed.user, propertyId: typeof parsed.propertyId === 'number' ? parsed.propertyId : null };
  } catch {
    return null;
  }
};

export const saveSession = async (session: Session): Promise<void> => {
  try {
    await Preferences.set({ key: KEY, value: JSON.stringify(session) });
  } catch {
    /* storage unavailable: the session lives for this launch only */
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: KEY });
  } catch {
    /* nothing to clear */
  }
};
