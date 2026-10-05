import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useRepository } from '~/repositories/repositoryContext';
import { onAppStateChange } from '~/services/native';
import { loadPersisted, savePersisted } from '~/services/persistence';
import { AppContext, type AppContextValue, type AppData } from './appContext';
import { PERSISTED_KEYS, STATE_VERSION, initialAppState, type AppState, type PersistedState } from './appState';
import { reducer } from './reducer';

export { useApp } from './appContext';
export type { AppContextValue, AppData, DataStatus } from './appContext';

/**
 * Holds the UI state (reducer), loads the property and content through the
 * repository once, persists the session, and restores it on launch.
 */

const pick = (state: AppState): PersistedState => {
  const out = {} as Record<string, unknown>;
  PERSISTED_KEYS.forEach((key) => {
    out[key] = state[key];
  });
  return out as PersistedState;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const repository = useRepository();
  const [state, dispatch] = useReducer(reducer, undefined, initialAppState);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<AppData>({ status: 'loading', error: null, bundle: null, content: null, places: [], distances: {} });
  const [reloadKey, setReloadKey] = useState(0);
  const saveTimer = useRef<number | null>(null);

  // 1. Restore the previous session.
  useEffect(() => {
    let cancelled = false;
    loadPersisted<PersistedState>(STATE_VERSION)
      .then((persisted) => {
        if (cancelled) return;
        if (persisted) dispatch({ type: 'hydrate', state: { ...persisted, screen: 'splash' } });
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load the property, the content and the places through the repository.
  useEffect(() => {
    let cancelled = false;
    setData((d) => ({ ...d, status: 'loading', error: null }));
    Promise.all([repository.getProperty(), repository.getContent(), repository.getPlaces()])
      .then(([bundle, content, places]) => {
        if (cancelled) return;
        setData({ status: 'ready', error: null, bundle, content, places, distances: {} });
        dispatch({ type: 'setHistory', history: content.tourHistory });
        const nodes = [...bundle.amenities.filter((a) => a.showInStopsList).map((a) => a.node), ...bundle.units.filter((u) => u.showInStopsList).map((u) => u.node)];
        repository
          .getStopDistances(nodes)
          .then((distances) => {
            if (!cancelled) setData((d) => ({ ...d, distances }));
          })
          .catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setData({ status: 'error', error: error instanceof Error ? error.message : 'The property could not be loaded.', bundle: null, content: null, places: [], distances: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadKey]);

  // 3. Persist (debounced) and flush when the app goes to the background.
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

  const value = useMemo<AppContextValue>(() => ({ state, dispatch, data, hydrated, reload: () => setReloadKey((k) => k + 1) }), [state, data, hydrated]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

