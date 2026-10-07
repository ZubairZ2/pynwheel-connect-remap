import { existsSync, readFileSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/**
 * Pynwheel Tour — Capacitor shell for the iOS and Android apps.
 *
 * The web build in `dist/` is bundled into the native projects. Data comes
 * from the Pynwheel Tour App API at `VITE_TOUR_API_URL` (a build-time value:
 * `.env.production.local` for a development build pointed at your machine;
 * the CI environment for a release). Android allows plain HTTP to that host
 * through `android:usesCleartextTraffic` in the manifest; a release build
 * should point at an https URL.
 */
/**
 * The API URL the web bundle was built with (VITE_TOUR_API_URL from the
 * environment, else .env.production.local, else .env.production). A plain
 * http URL means a development build against a machine on the LAN; a release
 * uses https and gets a strict web view.
 */
const apiUrl = (): string => {
  if (process.env.VITE_TOUR_API_URL) return process.env.VITE_TOUR_API_URL;
  for (const file of ['.env.production.local', '.env.local', '.env.production']) {
    if (!existsSync(file)) continue;
    const match = /^VITE_TOUR_API_URL=(.+)$/m.exec(readFileSync(file, 'utf8'));
    if (match) return match[1].trim();
  }
  return '';
};
const developmentApi = /^http:\/\//i.test(apiUrl());

const config: CapacitorConfig = {
  appId: 'com.pynwheel.tour',
  appName: 'Pynwheel Tour',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  ios: {
    contentInset: 'never',
    scheme: 'Pynwheel Tour',
    backgroundColor: '#FFFFFF'
  },
  android: {
    backgroundColor: '#FFFFFF',
    // The web view's origin is https://localhost; a development API on plain http (http://<lan-ip>:8000)
    // is mixed content and would be blocked without this. A release (https API) keeps the strict default.
    allowMixedContent: developmentApi
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: true
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true
    }
  }
};

export default config;
