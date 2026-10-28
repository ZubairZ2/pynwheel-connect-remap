import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

/**
 * The phone's position (October 28, 2026). Guarded like the rest of the
 * native edge: on a desktop browser (the Vite dev build, Playwright) the same
 * calls fall back to `navigator.geolocation`, so a page can be driven with a
 * fake position. Nothing here decides whether the visitor is at a property;
 * the server does that from the fix this module hands it.
 */

/** What the phone lets the app know. */
export type LocationAccess =
  | 'prompt' // never asked
  | 'granted' // precise, while in use
  | 'coarse' // "Precise: Off" (iOS) / approximate (Android 12+)
  | 'denied' // refused this time
  | 'denied_forever' // refused before and the system no longer asks
  | 'services_off' // the phone's Location Services are off
  | 'unavailable'; // no provider at all (an old browser)

export interface Fix {
  lat: number;
  lng: number;
  /** The provider's horizontal accuracy radius in metres. */
  accuracyM: number;
  /** When the provider took the reading, ISO 8601 UTC. */
  fixAt: string;
  source: 'native' | 'web';
}

export type LocationFailureReason = 'denied' | 'denied_forever' | 'services_off' | 'timeout' | 'unavailable' | 'poor_accuracy';

export interface LocationFailure {
  reason: LocationFailureReason;
  /** The best reading seen while waiting, when the wait ended on accuracy alone. */
  bestEffort?: Fix;
}

export type AcquireResult = { ok: true; fix: Fix } | { ok: false; failure: LocationFailure };

export interface AcquireOptions {
  /** A reading at least this accurate ends the wait at once. */
  goodM?: number;
  /** How long to wait for a good reading before settling for the best one. */
  maxWaitMs?: number;
  /** The best reading must be at least this accurate to count at all. */
  acceptM?: number;
  /** A cached reading up to this old may be used. */
  maximumAgeMs?: number;
}

export const DEFAULTS: Required<AcquireOptions> = { goodM: 50, maxWaitMs: 12000, acceptM: 200, maximumAgeMs: 15000 };

const ASKED_KEY = 'pynwheel_location_asked_v1';

const native = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Geolocation');

const webProvider = (): globalThis.Geolocation | null => (typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : null);

const toFix = (position: Position | GeolocationPosition, source: Fix['source']): Fix => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracyM: Math.max(0, Math.round(position.coords.accuracy ?? 0)),
  fixAt: new Date(position.timestamp || Date.now()).toISOString(),
  source
});

const asked = async (): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key: ASKED_KEY });
    return value === '1';
  } catch {
    return false;
  }
};

const rememberAsked = async (): Promise<void> => {
  try {
    await Preferences.set({ key: ASKED_KEY, value: '1' });
  } catch {
    /* no storage */
  }
};

const mapStatus = (status: { location: string; coarseLocation?: string }, askedBefore: boolean): LocationAccess => {
  if (status.location === 'granted') return 'granted';
  if (status.coarseLocation === 'granted') return 'coarse';
  if (status.location === 'denied' || status.coarseLocation === 'denied') return askedBefore ? 'denied_forever' : 'denied';
  return 'prompt';
};

/** The browser's own answer (the Permissions API), when it has one; 'prompt' otherwise. */
const webPermission = async (): Promise<LocationAccess> => {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    if (status?.state === 'granted') return 'granted';
    if (status?.state === 'denied') return 'denied';
  } catch {
    /* no Permissions API */
  }
  return 'prompt';
};

/** What the phone currently allows, without asking. */
export const checkPermission = async (): Promise<LocationAccess> => {
  if (!native()) return webProvider() ? webPermission() : 'unavailable';
  try {
    return mapStatus(await Geolocation.checkPermissions(), await asked());
  } catch {
    return 'services_off';
  }
};

/** Ask the phone (the system prompt), and remember that we did. */
export const requestPermission = async (): Promise<LocationAccess> => {
  if (!native()) return webProvider() ? 'granted' : 'unavailable';
  const before = await asked();
  try {
    const status = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
    await rememberAsked();
    return mapStatus(status, before);
  } catch {
    return 'services_off';
  }
};

const failureOf = (error: unknown): LocationFailureReason => {
  const code = (error as { code?: number } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  if (code === 1 || message.includes('denied')) return 'denied';
  if (code === 3 || message.includes('timeout')) return 'timeout';
  if (message.includes('location services') || message.includes('disabled')) return 'services_off';
  return 'unavailable';
};

type WatchHandle = { clear: () => Promise<void> };

/** One watch on the provider, as a promise of a handle; the callback sees every reading. */
const startWatch = async (onFix: (fix: Fix) => void, onError: (error: unknown) => void, opts: Required<AcquireOptions>): Promise<WatchHandle> => {
  if (native()) {
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: opts.maxWaitMs, maximumAge: opts.maximumAgeMs, minimumUpdateInterval: 1000 }, (position, error) => {
      if (error) onError(error);
      else if (position) onFix(toFix(position, 'native'));
    });
    return { clear: () => Geolocation.clearWatch({ id }) };
  }
  const provider = webProvider();
  if (!provider) throw new Error('unavailable');
  const id = provider.watchPosition((position) => onFix(toFix(position, 'web')), onError, { enableHighAccuracy: true, timeout: opts.maxWaitMs, maximumAge: opts.maximumAgeMs });
  return { clear: async () => provider.clearWatch(id) };
};

let inflight: Promise<AcquireResult> | null = null;

/**
 * One reading good enough to send: the first at least `goodM` accurate, else
 * after `maxWaitMs` the best seen if within `acceptM`, else a failure that
 * still carries the best effort. Concurrent callers share one wait; the
 * watch is always cleared.
 */
export const acquireFix = (options: AcquireOptions = {}): Promise<AcquireResult> => {
  if (inflight) return inflight;
  const run = acquire({ ...DEFAULTS, ...options }).finally(() => {
    if (inflight === run) inflight = null;
  });
  inflight = run;
  return run;
};

const acquire = (opts: Required<AcquireOptions>): Promise<AcquireResult> =>
  new Promise((resolve) => {
    let best: Fix | null = null;
    let handle: WatchHandle | null = null;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: AcquireResult) => {
      if (done) return;
      done = true;
      if (timer != null) clearTimeout(timer);
      void handle?.clear().catch(() => undefined);
      resolve(result);
    };
    const settle = () => {
      if (best && best.accuracyM <= opts.acceptM) finish({ ok: true, fix: best });
      else finish({ ok: false, failure: { reason: best ? 'poor_accuracy' : 'timeout', ...(best ? { bestEffort: best } : {}) } });
    };
    timer = setTimeout(settle, opts.maxWaitMs);
    startWatch(
      (fix) => {
        if (!best || fix.accuracyM < best.accuracyM) best = fix;
        if (fix.accuracyM <= opts.goodM) finish({ ok: true, fix });
      },
      (error) => {
        const reason = failureOf(error);
        if (reason === 'timeout') settle();
        else finish({ ok: false, failure: { reason, ...(best ? { bestEffort: best } : {}) } });
      },
      opts
    )
      .then((h) => {
        handle = h;
        if (done) void h.clear().catch(() => undefined);
      })
      .catch((error) => finish({ ok: false, failure: { reason: failureOf(error) } }));
  });

type Subscriber = (fix: Fix) => void;
const subscribers = new Set<Subscriber>();
let shared: Promise<WatchHandle> | null = null;

/**
 * Readings as they come, for the tour's presence samples. All subscribers
 * share one watch; the watch stops when the last one leaves.
 */
export const watchFixes = (onFix: Subscriber): (() => void) => {
  subscribers.add(onFix);
  if (!shared) {
    shared = startWatch(
      (fix) => subscribers.forEach((s) => s(fix)),
      () => undefined,
      { ...DEFAULTS, maxWaitMs: 30000 }
    ).catch((error) => {
      shared = null;
      throw error;
    });
    shared.catch(() => undefined);
  }
  return () => {
    subscribers.delete(onFix);
    if (subscribers.size === 0 && shared) {
      const stopping = shared;
      shared = null;
      void stopping.then((h) => h.clear()).catch(() => undefined);
    }
  };
};

/** For tests: forget the shared watch and the in-flight wait. */
export const resetLocationForTests = (): void => {
  inflight = null;
  shared = null;
  subscribers.clear();
};
