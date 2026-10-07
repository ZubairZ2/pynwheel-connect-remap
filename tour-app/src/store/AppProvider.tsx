import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useRepository } from '~/repositories/repositoryContext';
import { onAppStateChange } from '~/services/native';
import { loadPersisted, savePersisted } from '~/services/persistence';
import { AppContext, type AppContextValue, type AppData } from './appContext';
import { PERSISTED_KEYS, STATE_VERSION, initialAppState, type AppState, type PersistedState } from './appState';
import { reducer } from './reducer';

export { useApp } from './appContext';
export type { AppContextValue, AppData, DataStatus } from './appContext';

/**
 * Holds the UI state (reducer), restores the session and the UI state on
 * launch, loads the chosen property through the repository (and the
 * property list for the picker), persists the UI state, and signs the
 * visitor out when the backend says the session is gone.
 */

const pick = (state: AppState): PersistedState => {
  const out = {} as Record<string, unknown>;
  PERSISTED_KEYS.forEach((key) => {
    out[key] = state[key];
  });
  return out as PersistedState;
};

const EMPTY: AppData = { status: 'idle', error: null, bundle: null, content: null, places: [], distances: {}, properties: [], propertiesStatus: 'idle' };

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const repository = useRepository();
  const [state, dispatch] = useReducer(reducer, undefined, initialAppState);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [propertiesKey, setPropertiesKey] = useState(0);
  const saveTimer = useRef<number | null>(null);

  // 1. Restore the previous session (the repository's store) and the UI state.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPersisted<PersistedState>(STATE_VERSION), repository.restoreSession()])
      .then(([persisted, session]) => {
        if (cancelled) return;
        const base: PersistedState = { ...(persisted ?? ({} as PersistedState)), screen: 'splash' };
        if (session) {
          base.signedIn = true;
          base.user = { name: session.user.name, email: session.user.email };
          base.propertyId = session.propertyId;
          if (session.propertyId == null && persisted?.screen !== 'search') base.screen = 'splash';
        } else {
          base.signedIn = false;
          base.user = null;
          base.propertyId = null;
        }
        dispatch({ type: 'hydrate', state: base });
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // 2. The backend says the token is gone: back to sign-in with the reason.
  useEffect(() => repository.onSessionExpired((message) => dispatch({ type: 'sessionExpired', message: message || 'Your session has ended. Please sign in again.' })), [repository]);

  // 3. The property list, while signed in (for the picker on Search).
  useEffect(() => {
    if (!hydrated || !state.signedIn) {
      setData((d) => (d.properties.length || d.propertiesStatus !== 'idle' ? { ...d, properties: [], propertiesStatus: 'idle' } : d));
      return;
    }
    let cancelled = false;
    setData((d) => ({ ...d, propertiesStatus: 'loading' }));
    repository
      .getProperties()
      .then((properties) => {
        if (!cancelled) setData((d) => ({ ...d, properties, propertiesStatus: 'ready' }));
      })
      .catch(() => {
        if (!cancelled) setData((d) => ({ ...d, propertiesStatus: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [repository, hydrated, state.signedIn, state.propertyId, propertiesKey]);

  // 4. The chosen property: bundle, content and places. Nothing stale is kept while a new one loads.
  useEffect(() => {
    if (!hydrated) return;
    if (!state.signedIn || state.propertyId == null) {
      setData((d) => ({ ...d, status: 'idle', error: null, bundle: null, content: null, places: [], distances: {} }));
      return;
    }
    let cancelled = false;
    setData((d) => ({ ...d, status: 'loading', error: null, bundle: null, content: null, places: [], distances: {} }));
    Promise.all([repository.getProperty(), repository.getContent(), repository.getPlaces()])
      .then(([bundle, content, places]) => {
        if (cancelled) return;
        setData((d) => ({ ...d, status: 'ready', error: null, bundle, content, places, distances: {} }));
        dispatch({ type: 'setHistory', history: content.tourHistory });
        const nodes = [...bundle.amenities.filter((a) => a.showInStopsList).map((a) => a.node), ...bundle.units.filter((u) => u.showInStopsList).map((u) => u.node)];
        if (!nodes.length) return;
        repository
          .getStopDistances(nodes)
          .then((distances) => {
            if (!cancelled) setData((d) => ({ ...d, distances }));
          })
          .catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setData((d) => ({ ...d, status: 'error', error: error instanceof Error ? error.message : 'The property could not be loaded.', bundle: null, content: null, places: [], distances: {} }));
      });
    return () => {
      cancelled = true;
    };
  }, [repository, hydrated, reloadKey, state.signedIn, state.propertyId]);

  // 5. Persist (debounced) and flush when the app goes to the background.
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void savePersisted(STATE_VERSION, pick(state)), 250);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, hydrated]);

  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!hydrated) return;
    return onAppStateChange((active) => {
      if (!active) void savePersisted(STATE_VERSION, pick(latest.current));
    });
  }, [hydrated]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const reloadProperties = useCallback(() => setPropertiesKey((k) => k + 1), []);
  const value = useMemo<AppContextValue>(() => ({ state, dispatch, data, hydrated, reload, reloadProperties }), [state, data, hydrated, reload, reloadProperties]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
