import { registerPlugin } from '@capacitor/core';
import type { IgloohomeBlePlugin } from './definitions';

export * from './definitions';

/** Native on Android (and iOS once the SDK's dependencies are wired); on the web every call rejects with `unavailable`. */
export const IgloohomeBle = registerPlugin<IgloohomeBlePlugin>('IgloohomeBle', {
  web: () => import('./web').then((m) => new m.IgloohomeBleWeb())
});
