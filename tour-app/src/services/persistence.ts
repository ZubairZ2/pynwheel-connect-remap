import { Preferences } from '@capacitor/preferences';

/**
 * App state persistence (`@capacitor/preferences`: UserDefaults on iOS,
 * SharedPreferences on Android, localStorage on the web), so a backgrounded
 * or relaunched app comes back to the same floor, From, To, route and
 * simulation. Every call is guarded: a storage failure never breaks the app.
 */

const KEY = 'pynwheel_tour_app_state_v1';

export interface PersistedEnvelope<T> {
  version: number;
  savedAt: number;
  state: T;
}

export const loadPersisted = async <T>(version: number): Promise<T | null> => {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as PersistedEnvelope<T>;
    if (!parsed || parsed.version !== version || typeof parsed.state !== 'object') return null;
    return parsed.state;
  } catch {
    return null;
  }
};

export const savePersisted = async <T>(version: number, state: T): Promise<void> => {
  try {
    const envelope: PersistedEnvelope<T> = { version, savedAt: Date.now(), state };
    await Preferences.set({ key: KEY, value: JSON.stringify(envelope) });
  } catch {
    /* storage unavailable (private mode, full) — the session simply does not persist */
  }
};

