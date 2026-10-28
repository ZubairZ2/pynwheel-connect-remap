import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useRepository } from '~/repositories/repositoryContext';
import { onAppStateChange } from '~/services/native';
import { loadPersisted, savePersisted } from '~/services/persistence';
import { visitQueue } from '~/services/visitQueue';
import { AppContext, type AppContextValue, type AppData } from './appContext';
import { PERSISTED_KEYS, STATE_VERSION, initialAppState, initialGuided, initialWayfinding, type AppState, type PersistedState } from './appState';
import { reducer } from './reducer';
import { tourFromBooking } from './useAppActions';
import { syncVisit, syncableVisit } from './visitSync';

export { useApp } from './appContext';
export type { AppContextValue, AppData, DataStatus } from './appContext';

/**
 * Holds the UI state (reducer), restores the session and the UI state on
 * launch, loads the chosen property through the repository (and the
 * property list for the picker), persists the UI state, and signs the
 * visitor out when the backend says the session is gone. Since October 23,
 * 2026 it also reads the server's capabilities on launch and keeps the
 * recorded visit in sync (on resume, when the phone is back online, and
 * with a heartbeat every two minutes while checked in).
 */

const HEARTBEAT_MS = 2 * 60000;
/** How often, at most, a resume re-checks the property's configuration version. */
const REVALIDATE_MS = 60000;

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
          base.user = { name: session.user.name, email: session.user.email, kind: session.kind, ...(session.visitor ? { phone: session.visitor.phone, firstName: session.visitor.firstName, lastName: session.visitor.lastName } : {}) };
          base.capabilities = session.capabilities;
          if (persisted && persisted.propertyId !== session.propertyId) {
            // The UI state was saved for another property (or the session store moved on): nothing of that
            // property's tour, selection, routes or floors may leak into this one.
            Object.assign(base, { selected: {}, tourOrder: [], stopIndex: 0, unlocked: {}, lockPins: {}, lockKeys: {}, notes: {}, guided: initialGuided(), wayfinding: initialWayfinding(), floorByLevel: {} });
          }
          base.propertyId = session.propertyId;
          if (session.propertyId == null && persisted?.screen !== 'search') base.screen = 'splash';
        } else {
          base.signedIn = false;
          base.user = null;
          base.propertyId = null;
        }
        dispatch({ type: 'hydrate', state: base });
        setHydrated(true);
        // A visitor's next booking at the property, as the CMS holds it, is the Home card unless a live one is already there.
        if (session?.kind === 'visitor' && session.propertyId != null) {
          const next = repository.visitorBookings().find((b) => b.propertyId === session.propertyId && b.status === 'upcoming');
          if (next) dispatch({ type: 'adoptBooking', tour: tourFromBooking(next, Date.now()) });
        }
      })
      .catch(() => setHydrated(true));
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // 1b. What the server can do (visit recording, the visitor sign-in), before anyone signs in; a failure keeps the last known answer.
  useEffect(() => {
    let cancelled = false;
    repository
      .getCapabilities()
      .then((capabilities) => {
        if (!cancelled) dispatch({ type: 'setCapabilities', capabilities });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // 2. The backend says the token is gone: back to sign-in with the reason. The visit outbox goes with the session.
  useEffect(
    () =>
      repository.onSessionExpired((message) => {
        void visitQueue.clear();
        dispatch({ type: 'sessionExpired', message: message || 'Your session has ended. Please sign in again.' });
      }),
    [repository]
  );

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
    // Not keyed on the chosen property: switching properties must not refetch the whole list (145 KB) every time.
  }, [repository, hydrated, state.signedIn, propertiesKey]);

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
        dispatch({ type: 'bundleLoaded', nodes });
        dispatch({ type: 'verificationRequired', propertyId: bundle.property.id, required: bundle.property.verificationRequired ?? null });
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
  const latestData = useRef(data);
  latestData.current = data;
  const lastCheck = useRef(0);

  // October 25, 2026: back in the foreground (and back online) the app asks one small question - is the property's
  // configuration it holds still the current one? - and reloads the property when it is not; a visitor's bookings are
  // read again too, so a tour the CMS moved, cancelled or completed shows as such. Throttled; nothing else is touched
  // (the session, the profile, the visit outbox, photos and notes stay as they are).
  const revalidate = useCallback(async () => {
    const s = latest.current;
    if (!s.signedIn || s.propertyId == null) return;
    const now = Date.now();
    if (now - lastCheck.current < REVALIDATE_MS) return;
    lastCheck.current = now;
    try {
      const version = await repository.getPropertyVersion();
      const held = latestData.current.bundle?.property.configVersion ?? null;
      if (version.configVersion && held && version.configVersion !== held) {
        dispatch({ type: 'bookingStale' });
        setReloadKey((k) => k + 1);
      }
    } catch {
      // Offline or refused: the next resume asks again.
    }
    if (s.user?.kind !== 'visitor') return;
    try {
      const bookings = await repository.refreshVisitorBookings();
      const propertyId = latest.current.propertyId;
      if (propertyId == null) return;
      const at = Date.now();
      dispatch({ type: 'syncBookings', propertyId, tours: bookings.filter((b) => b.propertyId === propertyId).map((b) => tourFromBooking(b, at)) });
    } catch {
      // As above.
    }
  }, [repository]);

  useEffect(() => {
    if (!hydrated) return;
    return onAppStateChange((active) => {
      if (!active) void savePersisted(STATE_VERSION, pick(latest.current));
      else {
        // Back in the foreground: whatever the outbox holds (and a check-in or end made offline) is sent, and the property is revalidated.
        void syncVisit({ repository, dispatch }, syncableVisit(latest.current));
        void revalidate();
      }
    });
  }, [hydrated, repository, revalidate]);

  // 6. The recorded visit: sent again when the phone is back online, and a heartbeat every two minutes while checked in and active.
  useEffect(() => {
    if (!hydrated) return;
    const online = () => {
      void syncVisit({ repository, dispatch }, syncableVisit(latest.current));
      void revalidate();
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [hydrated, repository, revalidate]);

  const visitId = state.visit?.id ?? null;
  const visitClientId = state.visit?.clientVisitId ?? null;
  const heartbeat = hydrated && state.signedIn && state.checkedIn && state.visit?.status === 'active' && visitId != null && visitClientId != null && state.visit.propertyId === state.propertyId;
  useEffect(() => {
    if (!heartbeat || visitClientId == null) return;
    const propertyId = latest.current.visit?.propertyId;
    if (propertyId == null) return;
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const visit = syncableVisit(latest.current);
      if (!visit || visit.clientVisitId !== visitClientId || visit.end) return;
      void visitQueue
        .append({ clientVisitId: visitClientId, propertyId, kind: 'heartbeat', stopId: null })
        .then(() => syncVisit({ repository, dispatch }, visit))
        .catch(() => undefined);
    };
    const id = window.setInterval(beat, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [heartbeat, visitClientId, repository]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const reloadProperties = useCallback(() => setPropertiesKey((k) => k + 1), []);
  const value = useMemo<AppContextValue>(() => ({ state, dispatch, data, hydrated, reload, reloadProperties }), [state, data, hydrated, reload, reloadProperties]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
