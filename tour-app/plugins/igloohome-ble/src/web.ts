import { WebPlugin } from '@capacitor/core';
import type { IgloohomeBlePermissionStatus, IgloohomeBlePlugin, IgloohomeBleState } from './definitions';

/** The browser has no igloohome SDK: `initialize` says so, every operation rejects with `unavailable`. Nothing is simulated. */
export class IgloohomeBleWeb extends WebPlugin implements IgloohomeBlePlugin {
  async initialize(): Promise<IgloohomeBleState> {
    return { supported: false, enabled: false, platform: 'web' };
  }

  async enableBluetooth(): Promise<{ enabled: boolean }> {
    return { enabled: false };
  }

  async checkPermissions(): Promise<IgloohomeBlePermissionStatus> {
    return { bluetooth: 'denied' };
  }

  async requestPermissions(): Promise<IgloohomeBlePermissionStatus> {
    return { bluetooth: 'denied' };
  }

  async startScan(): Promise<void> {
    throw this.unavailable('The igloohome Bluetooth SDK is only available in the native app.');
  }

  async stopScan(): Promise<void> {
    /* nothing was scanning */
  }

  async connect(): Promise<{ name: string }> {
    throw this.unavailable('The igloohome Bluetooth SDK is only available in the native app.');
  }

  async unlock(): Promise<{ unlocked: true }> {
    throw this.unavailable('The igloohome Bluetooth SDK is only available in the native app.');
  }

  async disconnect(): Promise<void> {
    /* nothing was connected */
  }

  async reset(): Promise<void> {
    /* nothing to reset */
  }
}
