/**
 * The screens of the app and how they relate (the reference's `screen`
 * state), plus which overlays can sit on top of them. Navigation is a
 * state machine, not URLs: a native app has no address bar, and the
 * Android back button must know what "back" means on every screen.
 */

export type Screen =
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'home'
  | 'search'
  | 'profile'
  | 'buildTour'
  | 'chooseStops'
  | 'scanQr'
  | 'arInit'
  | 'arLive'
  | 'guided'
  | 'stopDetail'
  | 'unlockUnit'
  | 'tourComplete'
  | 'tourSummary'
  | 'wayfinding';

export type Overlay = 'help' | 'itinerary' | 'addStop' | 'note' | 'video' | 'book' | 'aiChat' | 'apply' | 'notifications' | 'settings' | 'history' | 'placePicker' | 'floorPicker' | 'leaveTour';

/** Screens with the Home / Search / Profile tab bar. */
export const TABBED_SCREENS: Screen[] = ['home', 'search', 'profile'];

/** Screens drawn over a photo or black, where the status bar must be light-on-dark. */
export const DARK_SCREENS: Screen[] = ['scanQr', 'arInit', 'arLive'];

export const isTabbed = (screen: Screen): boolean => TABBED_SCREENS.includes(screen);

/** Overlays stack in this order (later = on top), as the reference's z-indexes do. */
export const OVERLAY_ORDER: Overlay[] = ['help', 'itinerary', 'note', 'video', 'addStop', 'book', 'aiChat', 'apply', 'notifications', 'settings', 'history', 'placePicker', 'floorPicker', 'leaveTour'];

export const topOverlay = (open: Overlay[]): Overlay | null => {
  for (let i = OVERLAY_ORDER.length - 1; i >= 0; i -= 1) {
    if (open.includes(OVERLAY_ORDER[i])) return OVERLAY_ORDER[i];
  }
  return null;
};

/**
 * Where "back" goes from a screen when no overlay is open. `null` means the
 * screen is a root: on Android the app may exit from there.
 */
export const backScreenOf = (screen: Screen, tourMode: 'self' | 'ar'): Screen | null => {
  switch (screen) {
    case 'splash':
    case 'onboarding':
    case 'login':
    case 'home':
      return null;
    case 'search':
    case 'profile':
    case 'buildTour':
    case 'scanQr':
    case 'wayfinding':
    case 'tourSummary':
      return 'home';
    case 'arInit':
      return 'scanQr';
    case 'chooseStops':
      return 'arInit';
    case 'arLive':
      return 'chooseStops';
    case 'guided':
      return tourMode === 'ar' ? 'arLive' : 'buildTour';
    case 'stopDetail':
    case 'unlockUnit':
      return 'guided';
    case 'tourComplete':
      return 'tourSummary';
    default:
      return 'home';
  }
};
