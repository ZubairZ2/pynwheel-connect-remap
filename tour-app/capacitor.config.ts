import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/**
 * Pynwheel Tour — Capacitor shell for the iOS and Android apps.
 *
 * The web build in `dist/` is bundled into the native projects; nothing is
 * loaded from a server, so the app works fully offline on dummy data. No
 * `server.url` is set on purpose: the app must never point at the Rails API
 * in this phase.
 */
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
    allowMixedContent: false
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
