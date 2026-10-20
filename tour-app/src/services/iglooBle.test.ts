import { describe, expect, it, vi } from 'vitest';
import type { IgloohomeBlePermissionStatus, IgloohomeBlePlugin, IgloohomeBleState, LockFoundEvent, ScanStoppedEvent } from '@pynwheel/igloohome-ble';
import { BluetoothUnlockError, toUnlockError, unlockOverBluetooth, type BluetoothPhase } from './iglooBle';

/**
 * The v1 sequence against a fake plugin that behaves like the native one:
 * events for found locks and the end of a scan, promises for the rest.
 * Nothing here proves the vendor SDK works on hardware; it proves the app
 * drives the plugin in the legacy order and surfaces every outcome.
 */

type Listener = (event: never) => void;

const fakePlugin = (overrides: Partial<Record<keyof IgloohomeBlePlugin, unknown>> = {}) => {
  const listeners = new Map<string, Set<Listener>>();
  const calls: string[] = [];
  const state: IgloohomeBleState = { supported: true, enabled: true, platform: 'android' };
  const permission: IgloohomeBlePermissionStatus = { bluetooth: 'granted' };
  const plugin: IgloohomeBlePlugin & { emit: (name: string, event: LockFoundEvent | ScanStoppedEvent) => void; calls: string[]; listenerCount: () => number } = {
    calls,
    emit: (name, event) => listeners.get(name)?.forEach((l) => l(event as never)),
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    initialize: vi.fn(async () => {
      calls.push('initialize');
      return state;
    }),
    checkPermissions: vi.fn(async () => {
      calls.push('checkPermissions');
      return permission;
    }),
    requestPermissions: vi.fn(async () => {
      calls.push('requestPermissions');
      return permission;
    }),
    startScan: vi.fn(async () => {
      calls.push('startScan');
    }),
    stopScan: vi.fn(async () => {
      calls.push('stopScan');
    }),
    connect: vi.fn(async ({ name }: { name: string }) => {
      calls.push('connect');
      return { name };
    }),
    unlock: vi.fn(async () => {
      calls.push('unlock');
      return { unlocked: true as const };
    }),
    disconnect: vi.fn(async () => {
      calls.push('disconnect');
    }),
    reset: vi.fn(async () => {
      calls.push('reset');
    }),
    addListener: vi.fn(async (name: string, listener: Listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
      return { remove: async () => void listeners.get(name)!.delete(listener) };
    }) as unknown as IgloohomeBlePlugin['addListener'],
    removeAllListeners: vi.fn(async () => listeners.clear()),
    ...(overrides as Partial<IgloohomeBlePlugin>)
  };
  return plugin;
};

const rejection = (code: string, message = code) => Object.assign(new Error(message), { code });

describe('unlockOverBluetooth', () => {
  it('runs the legacy order: initialize, permission, scan until the lock is seen, stop, connect with the key, unlock, disconnect', async () => {
    const plugin = fakePlugin();
    const phases: BluetoothPhase[] = [];
    const run = unlockOverBluetooth({ lockName: 'SK3E14001756', key: 'guest-key', plugin, available: true, onPhase: (p) => phases.push(p) });
    await vi.waitFor(() => expect(plugin.calls).toContain('startScan'));
    plugin.emit('lockFound', { name: 'OTHER', rssi: -70 });
    plugin.emit('lockFound', { name: 'SK3E14001756', rssi: -60 });
    await expect(run).resolves.toBeUndefined();
    expect(plugin.calls).toEqual(['initialize', 'checkPermissions', 'startScan', 'stopScan', 'connect', 'unlock', 'disconnect']);
    expect(plugin.connect).toHaveBeenCalledWith({ name: 'SK3E14001756', key: 'guest-key', timeoutMs: 30000 });
    expect(phases).toEqual(['preparing', 'scanning', 'connecting', 'unlocking']);
    expect(plugin.listenerCount()).toBe(0);
  });

  it('asks for the permission once when it is not granted, and stops when it stays denied', async () => {
    const plugin = fakePlugin({
      checkPermissions: vi.fn(async () => ({ bluetooth: 'prompt' as const })),
      requestPermissions: vi.fn(async () => ({ bluetooth: 'denied' as const }))
    });
    await expect(unlockOverBluetooth({ lockName: 'L', key: 'k', plugin, available: true })).rejects.toMatchObject({ code: 'permission_denied' });
    expect(plugin.requestPermissions).toHaveBeenCalledTimes(1);
    expect(plugin.startScan).not.toHaveBeenCalled();
    expect(plugin.disconnect).toHaveBeenCalled();
  });

  it('reports Bluetooth off and an unsupported phone before touching the radio', async () => {
    const off = fakePlugin({ initialize: vi.fn(async () => ({ supported: true, enabled: false, platform: 'android' })) });
    await expect(unlockOverBluetooth({ lockName: 'L', key: 'k', plugin: off, available: true })).rejects.toMatchObject({ code: 'bluetooth_off' });
    const none = fakePlugin({ initialize: vi.fn(async () => ({ supported: false, enabled: false, platform: 'android' })) });
    await expect(unlockOverBluetooth({ lockName: 'L', key: 'k', plugin: none, available: true })).rejects.toMatchObject({ code: 'unsupported' });
    expect(off.startScan).not.toHaveBeenCalled();
  });

  it('a scan that ends without the lock is not_found; a scan error carries the SDK message', async () => {
    const plugin = fakePlugin();
    const run = unlockOverBluetooth({ lockName: 'SK3E14001756', key: 'k', plugin, available: true, scanTimeoutMs: 5 });
    await vi.waitFor(() => expect(plugin.calls).toContain('startScan'));
    expect(plugin.startScan).toHaveBeenCalledWith({ timeoutMs: 5 });
    plugin.emit('lockFound', { name: 'SOMEONE_ELSE', rssi: null });
    plugin.emit('scanStopped', { reason: 'timeout' });
    await expect(run).rejects.toMatchObject({ code: 'not_found' });
    expect(plugin.connect).not.toHaveBeenCalled();

    const broken = fakePlugin();
    const run2 = unlockOverBluetooth({ lockName: 'L', key: 'k', plugin: broken, available: true });
    await vi.waitFor(() => expect(broken.calls).toContain('startScan'));
    broken.emit('scanStopped', { reason: 'error', message: 'BluetoothException: adapter reset' });
    await expect(run2).rejects.toMatchObject({ code: 'sdk_error', message: 'BluetoothException: adapter reset' });
  });

  it('a scan the plugin stopped or paused was interrupted, not exhausted: cancelled, not not_found', async () => {
    for (const reason of ['stopped', 'paused'] as const) {
      const plugin = fakePlugin();
      const run = unlockOverBluetooth({ lockName: 'L', key: 'k', plugin, available: true });
      await vi.waitFor(() => expect(plugin.calls).toContain('startScan'));
      plugin.emit('scanStopped', { reason });
      await expect(run).rejects.toMatchObject({ code: 'cancelled' });
      expect(plugin.connect).not.toHaveBeenCalled();
    }
  });

  it("the plugin's rejection codes reach the caller: invalid key on connect, a lock that will not open", async () => {
    const badKey = fakePlugin({ connect: vi.fn(async () => Promise.reject(rejection('invalid_key', 'InvalidKeyException'))) });
    const run = unlockOverBluetooth({ lockName: 'L', key: 'k', plugin: badKey, available: true });
    await vi.waitFor(() => expect(badKey.calls).toContain('startScan'));
    badKey.emit('lockFound', { name: 'L', rssi: null });
    await expect(run).rejects.toMatchObject({ code: 'invalid_key' });
    expect(badKey.unlock).not.toHaveBeenCalled();
    expect(badKey.disconnect).toHaveBeenCalled();

    const stuck = fakePlugin({ unlock: vi.fn(async () => Promise.reject(rejection('unlock_failed', 'LockGenericFailureException'))) });
    const run2 = unlockOverBluetooth({ lockName: 'L', key: 'k', plugin: stuck, available: true });
    await vi.waitFor(() => expect(stuck.calls).toContain('startScan'));
    stuck.emit('lockFound', { name: 'L', rssi: null });
    await expect(run2).rejects.toMatchObject({ code: 'unlock_failed' });
    expect(stuck.disconnect).toHaveBeenCalled();
  });

  it('cancelling during the scan resets the plugin and rejects with cancelled', async () => {
    const plugin = fakePlugin();
    const controller = new AbortController();
    const run = unlockOverBluetooth({ lockName: 'L', key: 'k', plugin, available: true, signal: controller.signal });
    await vi.waitFor(() => expect(plugin.calls).toContain('startScan'));
    controller.abort();
    await expect(run).rejects.toMatchObject({ code: 'cancelled' });
    expect(plugin.reset).toHaveBeenCalled();
    expect(plugin.connect).not.toHaveBeenCalled();
    expect(plugin.listenerCount()).toBe(0);
  });

  it('without the native plugin nothing is attempted', async () => {
    const plugin = fakePlugin();
    await expect(unlockOverBluetooth({ lockName: 'L', key: 'k', plugin, available: false })).rejects.toMatchObject({ code: 'unavailable' });
    expect(plugin.initialize).not.toHaveBeenCalled();
  });

  it('toUnlockError keeps known codes, maps Capacitor UNAVAILABLE, and defaults the rest', () => {
    expect(toUnlockError(rejection('timeout')).code).toBe('timeout');
    expect(toUnlockError({ code: 'UNAVAILABLE', message: 'not implemented' }).code).toBe('unavailable');
    expect(toUnlockError(new Error('boom')).code).toBe('sdk_error');
    expect(toUnlockError(new BluetoothUnlockError('busy', 'x')).code).toBe('busy');
    expect(toUnlockError(rejection('bluetooth_off')).message).toMatch(/Turn Bluetooth on/);
  });

  it("toUnlockError keeps the SDK's reason on the lock-side failures, and only there", () => {
    const failed = toUnlockError(rejection('unlock_failed', 'LockInvalidRightsException'));
    expect(failed.detail).toBe('LockInvalidRightsException');
    expect(failed.message).toBe('The lock did not open. Try again. (LockInvalidRightsException)');
    expect(toUnlockError(rejection('sdk_error', 'Command delivery failed')).message).toMatch(/\(Command delivery failed\)$/);
    const off = toUnlockError(rejection('bluetooth_off', 'Bluetooth is off'));
    expect(off.detail).toBeNull();
    expect(off.message).toBe('Turn Bluetooth on, then try again.');
    expect(toUnlockError(rejection('unlock_failed', '  ')).detail).toBeNull();
  });
});
