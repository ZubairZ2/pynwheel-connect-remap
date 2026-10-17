import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { IgloohomeBle, type IgloohomeBleErrorCode, type IgloohomeBlePlugin, type LockFoundEvent, type ScanStoppedEvent } from '@pynwheel/igloohome-ble';

/**
 * The igloohome v1 unlock, as the legacy Pynwheel Tour app's lock screen ran
 * it (`LockInfoScreen#unlockDoorForIgloo`): scan until the lock with the
 * backend's device id is seen (60 s), stop scanning, connect with the guest
 * key, unlock, and drop the connection. The vendor SDK does every Bluetooth
 * step through the `IgloohomeBle` plugin; this module only sequences it,
 * reports the phase for the screen, and turns the plugin's error codes into
 * sentences. The guest key is passed through and never logged.
 */

export type BluetoothPhase = 'preparing' | 'scanning' | 'connecting' | 'unlocking';

export class BluetoothUnlockError extends Error {
  constructor(
    public readonly code: IgloohomeBleErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BluetoothUnlockError';
  }
}

const MESSAGES: Record<IgloohomeBleErrorCode, string> = {
  unavailable: 'Bluetooth unlock is not available in this build of the app.',
  unsupported: 'This phone has no Bluetooth LE, so it cannot open the lock.',
  bluetooth_off: 'Turn Bluetooth on, then try again.',
  permission_denied: 'Allow Bluetooth for Pynwheel Tour in your phone settings, then try again.',
  not_found: 'The lock was not found nearby. Stand closer to the door and try again.',
  connect_failed: 'The phone could not connect to the lock. Try again.',
  invalid_key: 'The lock refused this key. Ask the leasing office for access.',
  timeout: 'The lock did not answer in time. Try again.',
  not_connected: 'The connection to the lock was lost. Try again.',
  unlock_failed: 'The lock did not open. Try again.',
  busy: 'The lock is still busy with the previous attempt. Wait a moment and try again.',
  cancelled: 'The unlock was cancelled.',
  sdk_error: 'The lock could not be opened. Try again.'
};

/** True on a native platform where the plugin is compiled in (Android with the SDK; iOS once its dependencies are wired). */
export const bluetoothUnlockAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('IgloohomeBle');

const KNOWN: IgloohomeBleErrorCode[] = ['unavailable', 'unsupported', 'bluetooth_off', 'permission_denied', 'not_found', 'connect_failed', 'invalid_key', 'timeout', 'not_connected', 'unlock_failed', 'busy', 'cancelled', 'sdk_error'];

/** A plugin rejection (`call.reject(message, code, …)`) or any other throw, as a `BluetoothUnlockError`. */
export const toUnlockError = (error: unknown): BluetoothUnlockError => {
  if (error instanceof BluetoothUnlockError) return error;
  const raw = error as { code?: unknown; data?: { code?: unknown }; message?: unknown } | null;
  const candidate = (raw?.code ?? raw?.data?.code) as string | undefined;
  const code: IgloohomeBleErrorCode = candidate === 'UNAVAILABLE' || candidate === 'UNIMPLEMENTED' ? 'unavailable' : KNOWN.includes(candidate as IgloohomeBleErrorCode) ? (candidate as IgloohomeBleErrorCode) : 'sdk_error';
  return new BluetoothUnlockError(code, MESSAGES[code]);
};

export interface UnlockOptions {
  /** The lock's Bluetooth name (the CMS device id, e.g. `SK3E14001756`). */
  lockName: string;
  /** The guest key the backend issued. */
  key: string;
  onPhase?: (phase: BluetoothPhase) => void;
  /** Cancels whatever step is running; the promise rejects with `cancelled` and the plugin is reset. */
  signal?: AbortSignal;
  scanTimeoutMs?: number;
  connectTimeoutMs?: number;
  unlockTimeoutMs?: number;
  /** The plugin to drive (tests pass a fake); defaults to the registered native plugin. */
  plugin?: IgloohomeBlePlugin;
  /** Whether the plugin is compiled in (tests override); defaults to `bluetoothUnlockAvailable()`. */
  available?: boolean;
}

/** Waits for the named lock to appear in the scan, or for the scan to stop first. */
const waitForLock = (plugin: IgloohomeBlePlugin, lockName: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const handles: PluginListenerHandle[] = [];
    let settled = false;
    const finish = (error?: BluetoothUnlockError) => {
      if (settled) return;
      settled = true;
      handles.forEach((h) => void h.remove());
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => finish(new BluetoothUnlockError('cancelled', MESSAGES.cancelled));
    signal?.addEventListener('abort', onAbort);
    plugin
      .addListener('lockFound', (event: LockFoundEvent) => {
        if (event.name === lockName) finish();
      })
      .then((h) => handles.push(h))
      .catch((error) => finish(toUnlockError(error)));
    plugin
      .addListener('scanStopped', (event: ScanStoppedEvent) => {
        if (event.reason === 'error') finish(new BluetoothUnlockError('sdk_error', event.message || MESSAGES.sdk_error));
        // A scan stopped by `reset` / `stopScan` or by the app going to the background was interrupted, not exhausted.
        else if (event.reason === 'paused' || event.reason === 'stopped') finish(new BluetoothUnlockError('cancelled', MESSAGES.cancelled));
        else finish(new BluetoothUnlockError('not_found', MESSAGES.not_found));
      })
      .then((h) => handles.push(h))
      .catch((error) => finish(toUnlockError(error)));
    plugin.startScan({ timeoutMs }).catch((error) => finish(toUnlockError(error)));
  });

/**
 * Opens the lock: resolves once the SDK reports it unlocked, rejects with a
 * `BluetoothUnlockError` otherwise. The plugin is always left disconnected.
 */
export const unlockOverBluetooth = async (options: UnlockOptions): Promise<void> => {
  const available = options.available ?? bluetoothUnlockAvailable();
  if (!available) throw new BluetoothUnlockError('unavailable', MESSAGES.unavailable);
  const plugin = options.plugin ?? IgloohomeBle;
  const signal = options.signal;
  const cancelled = () => signal?.aborted === true;
  const throwIfCancelled = () => {
    if (cancelled()) throw new BluetoothUnlockError('cancelled', MESSAGES.cancelled);
  };
  const phase = (p: BluetoothPhase) => options.onPhase?.(p);
  const onAbort = () => void plugin.reset().catch(() => undefined);
  signal?.addEventListener('abort', onAbort);
  try {
    phase('preparing');
    const state = await plugin.initialize().catch((error) => {
      throw toUnlockError(error);
    });
    throwIfCancelled();
    if (!state.supported) throw new BluetoothUnlockError('unsupported', MESSAGES.unsupported);
    if (!state.enabled) throw new BluetoothUnlockError('bluetooth_off', MESSAGES.bluetooth_off);
    let permission = (await plugin.checkPermissions().catch((error) => {
      throw toUnlockError(error);
    })).bluetooth;
    if (permission !== 'granted') {
      permission = (await plugin.requestPermissions().catch((error) => {
        throw toUnlockError(error);
      })).bluetooth;
    }
    throwIfCancelled();
    if (permission !== 'granted') throw new BluetoothUnlockError('permission_denied', MESSAGES.permission_denied);

    phase('scanning');
    await waitForLock(plugin, options.lockName, signal, options.scanTimeoutMs ?? 60_000);
    await plugin.stopScan().catch(() => undefined);
    throwIfCancelled();

    phase('connecting');
    await plugin.connect({ name: options.lockName, key: options.key, timeoutMs: options.connectTimeoutMs ?? 30_000 }).catch((error) => {
      throw toUnlockError(error);
    });
    throwIfCancelled();

    phase('unlocking');
    await plugin.unlock({ timeoutMs: options.unlockTimeoutMs ?? 30_000 }).catch((error) => {
      throw toUnlockError(error);
    });
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await plugin.disconnect().catch(() => undefined);
  }
};
