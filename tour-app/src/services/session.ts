import { Preferences } from '@capacitor/preferences';

/**
 * The signed-in session: the API token, who is signed in and which property
 * is selected. Stored with `@capacitor/preferences` (UserDefaults / Shared
 * Preferences / localStorage), separately from the UI state, so a relaunch
 * restores the session and signing out removes exactly this.
 *
 * October 23, 2026: two kinds of principal. `staff` is a CMS Super Admin
 * (Doorkeeper token, `POST /auth/login`); `visitor` is a prospect who proved
 * a phone number (`vst_…` token, `POST /visitor/otp/verify`). `user` is
 * always present as the principal's summary (for a visitor it is derived
 * from `visitor`, with role `visitor`); `visitor` carries the full profile.
 * `capabilities` is what the server said it can do when it issued the token.
 *
 * Note: Preferences is not an encrypted store. Moving the token to the
 * Keychain / Keystore (a secure-storage plugin) is the follow-up; it means
 * swapping the two calls below, nothing else reads the token directly.
 */

const KEY = 'pynwheel_tour_session_v1';

export type SessionKind = 'staff' | 'visitor';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  /** The visitor's phone (E.164 as the server keeps it); staff have none here. */
  phone?: string | null;
  /** The visitor's names as the CMS stores them (October 25, 2026): the Schedule form prefills from these, not from a split of `name`. */
  firstName?: string;
  lastName?: string;
}

export interface SessionVisitor {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  phoneMasked: string | null;
  smsEnabled: boolean;
}

/** The optional server features (`GET /health` and every sign-in answer): visit recording and the visitor sign-in. */
export interface Capabilities {
  visits: boolean;
  visitorAuth: boolean;
  /** The server refuses an in-person check-in it cannot place at the property (October 28, 2026). */
  locationRequired: boolean;
  /** The server keeps a presence state from `location` events during a visit. */
  presence: boolean;
}

export const NO_CAPABILITIES: Capabilities = { visits: false, visitorAuth: false, locationRequired: false, presence: false };

export interface Session {
  kind: SessionKind;
  accessToken: string;
  expiresAt: string | null;
  user: SessionUser;
  visitor: SessionVisitor | null;
  propertyId: number | null;
  capabilities: Capabilities;
}

export const parseCapabilities = (raw: unknown): Capabilities => {
  const c = raw && typeof raw === 'object' ? (raw as { visits?: unknown; visitor_auth?: unknown; visitorAuth?: unknown; location_required?: unknown; locationRequired?: unknown; presence?: unknown }) : {};
  return {
    visits: c.visits === true,
    visitorAuth: c.visitor_auth === true || c.visitorAuth === true,
    locationRequired: c.location_required === true || c.locationRequired === true,
    presence: c.presence === true
  };
};

export const loadSession = async (): Promise<Session | null> => {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Session>;
    if (!parsed || typeof parsed.accessToken !== 'string' || !parsed.user) return null;
    // A session saved before the visitor sign-in existed has no kind: it was a staff token.
    const kind: SessionKind = parsed.kind === 'visitor' ? 'visitor' : 'staff';
    return {
      kind,
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt ?? null,
      user: parsed.user,
      visitor: kind === 'visitor' && parsed.visitor ? parsed.visitor : null,
      propertyId: typeof parsed.propertyId === 'number' ? parsed.propertyId : null,
      capabilities: parseCapabilities(parsed.capabilities)
    };
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
