import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  native: true,
  status: { location: 'prompt', coarseLocation: 'prompt' } as { location: string; coarseLocation: string },
  checkThrows: false,
  asked: null as string | null,
  watches: [] as Array<{ id: string; cb: (position: unknown, error?: unknown) => void; cleared: boolean }>,
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => plugin.native, isPluginAvailable: () => plugin.native, getPlatform: () => (plugin.native ? 'ios' : 'web') } }));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: { checkPermissions: plugin.checkPermissions, requestPermissions: plugin.requestPermissions, watchPosition: plugin.watchPosition, clearWatch: plugin.clearWatch } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: async () => ({ value: plugin.asked }), set: async ({ value }: { value: string }) => { plugin.asked = value; } } }));

import { acquireFix, checkPermission, requestPermission, resetLocationForTests, watchFixes } from './location';

const position = (accuracy: number, timestamp = 1_700_000_000_000) => ({ coords: { latitude: 49.229, longitude: -122.997, accuracy }, timestamp });

const emit = (accuracy: number) => plugin.watches.filter((w) => !w.cleared).forEach((w) => w.cb(position(accuracy)));

describe('location service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetLocationForTests();
    plugin.native = true;
    plugin.status = { location: 'prompt', coarseLocation: 'prompt' };
    plugin.checkThrows = false;
    plugin.asked = null;
    plugin.watches = [];
    plugin.checkPermissions.mockImplementation(async () => {
      if (plugin.checkThrows) throw new Error('Location services are not enabled');
      return plugin.status;
    });
    plugin.requestPermissions.mockImplementation(async () => {
      if (plugin.checkThrows) throw new Error('Location services are not enabled');
      return plugin.status;
    });
    plugin.watchPosition.mockImplementation(async (_opts: unknown, cb: (p: unknown, e?: unknown) => void) => {
      const id = `w${plugin.watches.length + 1}`;
      plugin.watches.push({ id, cb, cleared: false });
      return id;
    });
    plugin.clearWatch.mockImplementation(async ({ id }: { id: string }) => {
      const w = plugin.watches.find((x) => x.id === id);
      if (w) w.cleared = true;
    });
  });
  afterEach(() => vi.useRealTimers());

  it('maps the plugin status to what the phone allows, and remembers the first ask', async () => {
    expect(await checkPermission()).toBe('prompt');
    plugin.status = { location: 'granted', coarseLocation: 'granted' };
    expect(await checkPermission()).toBe('granted');
    plugin.status = { location: 'denied', coarseLocation: 'granted' };
    expect(await checkPermission()).toBe('coarse');
    plugin.status = { location: 'denied', coarseLocation: 'denied' };
    expect(await requestPermission()).toBe('denied');
    expect(plugin.asked).toBe('1');
    expect(await requestPermission()).toBe('denied_forever');
    plugin.checkThrows = true;
    expect(await checkPermission()).toBe('services_off');
    expect(await requestPermission()).toBe('services_off');
  });

  it('takes the first reading at least 50 m accurate and clears the watch', async () => {
    const wait = acquireFix();
    await vi.advanceTimersByTimeAsync(0);
    emit(120);
    emit(30);
    const result = await wait;
    expect(result.ok && result.fix.accuracyM).toBe(30);
    expect(result.ok && result.fix.fixAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(result.ok && result.fix.source).toBe('native');
    expect(plugin.watches[0].cleared).toBe(true);
  });

  it('settles for the best reading within 200 m at the deadline, else reports poor accuracy with the best effort', async () => {
    const wait = acquireFix();
    await vi.advanceTimersByTimeAsync(0);
    emit(150);
    emit(90);
    await vi.advanceTimersByTimeAsync(12000);
    const result = await wait;
    expect(result.ok && result.fix.accuracyM).toBe(90);
    expect(plugin.watches[0].cleared).toBe(true);

    const wait2 = acquireFix();
    await vi.advanceTimersByTimeAsync(0);
    emit(600);
    await vi.advanceTimersByTimeAsync(12000);
    const poor = await wait2;
    expect(!poor.ok && poor.failure.reason).toBe('poor_accuracy');
    expect(!poor.ok && poor.failure.bestEffort?.accuracyM).toBe(600);

    const wait3 = acquireFix();
    await vi.advanceTimersByTimeAsync(12000);
    const none = await wait3;
    expect(!none.ok && none.failure.reason).toBe('timeout');
    expect(plugin.watches.every((w) => w.cleared)).toBe(true);
  });

  it('shares one wait between concurrent callers and reports a provider error', async () => {
    const a = acquireFix();
    const b = acquireFix();
    expect(b).toBe(a);
    await vi.advanceTimersByTimeAsync(0);
    expect(plugin.watchPosition).toHaveBeenCalledTimes(1);
    plugin.watches[0].cb(null, { message: 'User denied Geolocation' });
    const result = await a;
    expect(!result.ok && result.failure.reason).toBe('denied');
    const again = acquireFix();
    expect(again).not.toBe(a);
    await vi.advanceTimersByTimeAsync(0);
    plugin.watches[1].cb(null, { message: 'Location services are not enabled' });
    expect(!(await again).ok).toBe(true);
  });

  it('keeps one shared watch for subscribers and stops it when the last one leaves', async () => {
    const seen: number[] = [];
    const stopA = watchFixes((f) => seen.push(f.accuracyM));
    const stopB = watchFixes((f) => seen.push(f.accuracyM * 10));
    await vi.advanceTimersByTimeAsync(0);
    expect(plugin.watchPosition).toHaveBeenCalledTimes(1);
    emit(40);
    expect(seen).toEqual([40, 400]);
    stopA();
    emit(20);
    expect(seen).toEqual([40, 400, 200]);
    stopB();
    await vi.advanceTimersByTimeAsync(0);
    expect(plugin.watches[0].cleared).toBe(true);
  });

  it('falls back to the browser provider off the phone', async () => {
    plugin.native = false;
    const web = { watchPosition: vi.fn((ok: (p: GeolocationPosition) => void) => { ok(position(15) as unknown as GeolocationPosition); return 7; }), clearWatch: vi.fn() };
    if (typeof navigator === 'undefined') Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    Object.defineProperty(navigator, 'geolocation', { value: web, configurable: true });
    expect(await checkPermission()).toBe('prompt');
    expect(await requestPermission()).toBe('granted');
    const result = await acquireFix();
    expect(result.ok && result.fix.source).toBe('web');
    expect(web.clearWatch).toHaveBeenCalledWith(7);
  });
});
