import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * The native edge of the app: status bar, splash screen, keyboard, haptics,
 * the Android back button and app resume. Every call is guarded so the
 * same code runs in a desktop browser (where the plugins are not
 * available) without errors.
 */

export const isNative = (): boolean => Capacitor.isNativePlatform();

export const platform = (): 'ios' | 'android' | 'web' => Capacitor.getPlatform() as 'ios' | 'android' | 'web';

const available = (name: string): boolean => Capacitor.isPluginAvailable(name);

/** Light chrome (dark icons on white) or dark chrome (white icons over a photo / black screen). */
export const setChrome = async (dark: boolean): Promise<void> => {
  if (!isNative() || !available('StatusBar')) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: dark ? '#000000' : '#FFFFFF' });
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch {
    /* a simulator without a status bar */
  }
};

export const hideSplash = async (): Promise<void> => {
  if (!isNative() || !available('SplashScreen')) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    /* already hidden */
  }
};

export const hideKeyboard = async (): Promise<void> => {
  if (!isNative() || !available('Keyboard')) {
    (document.activeElement as HTMLElement | null)?.blur?.();
    return;
  }
  try {
    await Keyboard.hide();
  } catch {
    /* no keyboard */
  }
};

export const tap = async (): Promise<void> => {
  if (!isNative() || !available('Haptics')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* unsupported */
  }
};

export const success = async (): Promise<void> => {
  if (!isNative() || !available('Haptics')) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* unsupported */
  }
};

/** Android hardware / gesture back. The handler returns true when it consumed the event; otherwise the app exits when nothing can go back. */
export const onBackButton = (handler: () => boolean): (() => void) => {
  if (!isNative() || !available('App')) {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler();
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }
  let handle: PluginListenerHandle | null = null;
  App.addListener('backButton', () => {
    if (!handler()) void App.exitApp();
  })
    .then((h) => {
      handle = h;
    })
    .catch(() => undefined);
  return () => {
    void handle?.remove();
  };
};

/** App moved to the foreground / background (resume / pause). */
export const onAppStateChange = (handler: (active: boolean) => void): (() => void) => {
  if (!isNative() || !available('App')) {
    const visibility = () => handler(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }
  let handle: PluginListenerHandle | null = null;
  App.addListener('appStateChange', ({ isActive }) => handler(isActive))
    .then((h) => {
      handle = h;
    })
    .catch(() => undefined);
  return () => {
    void handle?.remove();
  };
};

/** Keyboard height changes, so a sheet with an input can lift above the keyboard. */
export const onKeyboard = (handler: (heightPx: number) => void): (() => void) => {
  if (!isNative() || !available('Keyboard')) {
    const viewport = window.visualViewport;
    if (!viewport) return () => undefined;
    const resize = () => handler(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    viewport.addEventListener('resize', resize);
    return () => viewport.removeEventListener('resize', resize);
  }
  const handles: PluginListenerHandle[] = [];
  Keyboard.addListener('keyboardWillShow', (info) => handler(info.keyboardHeight))
    .then((h) => handles.push(h))
    .catch(() => undefined);
  Keyboard.addListener('keyboardWillHide', () => handler(0))
    .then((h) => handles.push(h))
    .catch(() => undefined);
  return () => handles.forEach((h) => void h.remove());
};
