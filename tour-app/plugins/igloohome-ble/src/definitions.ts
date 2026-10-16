import type { PluginListenerHandle } from '@capacitor/core';

/**
 * The igloohome Bluetooth SDK, as the Pynwheel Tour app's v1 lock flow uses
 * it: find the lock by its Bluetooth name, connect with the guest key the
 * backend issued, unlock, disconnect. Everything else the SDK can do
 * (pairing, PIN management, firmware, logs) is deliberately not exposed.
 *
 * Every rejection carries one of `IgloohomeBleErrorCode` in `code`, so the
 * app can say what went wrong without parsing vendor messages.
 */

export type IgloohomeBleErrorCode =
  /** Not a native platform, or the plugin is not compiled in (web, a build without the SDK). */
  | 'unavailable'
  /** The device has no Bluetooth LE radio. */
  | 'unsupported'
  /** Bluetooth is switched off. */
  | 'bluetooth_off'
  /** The visitor refused the Bluetooth (Android 12+) or location (Android 11 and below) permission. */
  | 'permission_denied'
  /** `connect` was asked for a lock the scan has not seen. */
  | 'not_found'
  /** The SDK could not establish or keep the connection. */
  | 'connect_failed'
  /** The lock rejected the guest key (wrong lock, expired or revoked key). */
  | 'invalid_key'
  /** The lock did not answer in time. */
  | 'timeout'
  /** `unlock` was called without a connected lock. */
  | 'not_connected'
  /** The lock refused to open. */
  | 'unlock_failed'
  /** Another scan / connection / unlock is already running. */
  | 'busy'
  /** The operation was cancelled by `reset` or `disconnect`. */
  | 'cancelled'
  /** Anything else the SDK raised; `message` has the vendor text. */
  | 'sdk_error';

export interface IgloohomeBleState {
  /** The plugin is compiled in and the device has Bluetooth LE. */
  supported: boolean;
  /** Bluetooth is switched on. */
  enabled: boolean;
  /** 'android' | 'ios' | 'web'. */
  platform: string;
}

export type IgloohomeBlePermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export interface IgloohomeBlePermissionStatus {
  /** The one permission the current OS version needs for scanning and connecting. */
  bluetooth: IgloohomeBlePermissionState;
}

export interface LockFoundEvent {
  /** The lock's Bluetooth name (the CMS's device id, e.g. `SK3E14001756`). */
  name: string;
  rssi: number | null;
}

export interface ScanStoppedEvent {
  reason: 'timeout' | 'stopped' | 'error' | 'paused';
  message?: string;
}

export interface IgloohomeBlePlugin {
  /** The SDK's state on this device; never throws. */
  initialize(): Promise<IgloohomeBleState>;
  checkPermissions(): Promise<IgloohomeBlePermissionStatus>;
  requestPermissions(): Promise<IgloohomeBlePermissionStatus>;
  /** Starts a low-latency scan; each lock seen is a `lockFound` event. Stops itself after `timeoutMs` (default 60 000). */
  startScan(options?: { timeoutMs?: number }): Promise<void>;
  stopScan(): Promise<void>;
  /** Connects to a lock the scan has seen, with the guest key. Resolves once the SDK reports the lock connected. */
  connect(options: { name: string; key: string; timeoutMs?: number }): Promise<{ name: string }>;
  /** Opens the connected lock. */
  unlock(options?: { timeoutMs?: number }): Promise<{ unlocked: true }>;
  disconnect(): Promise<void>;
  /** Stops scanning, drops any connection and forgets the found locks. */
  reset(): Promise<void>;
  addListener(eventName: 'lockFound', listener: (event: LockFoundEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'scanStopped', listener: (event: ScanStoppedEvent) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
