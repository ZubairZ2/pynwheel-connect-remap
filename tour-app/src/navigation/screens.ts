/**
 * The screens of the app and how they relate (the reference's `screen`
 * state), plus which overlays can sit on top of them. Navigation is a
 * state machine, not URLs: a native app has no address bar, and the
 * Android back button must know what "back" means on every screen.
 *
 * October 17, 2026: the design refresh added Get Started (sign-in and the
 * profile confirmation), Schedule Self-Tour, Verify Identity, Before You
 * Start / Return to Start, the unified Stop screen and Explore Property;
 * the Stop Detail and Unlock Unit screens became the one `stop` screen.
 */

export type Screen =
  | 'splash'
  | 'onboarding'
  | 'getStarted'
  | 'home'
  | 'search'
  | 'explore'
  | 'profile'
  | 'schedule'
  | 'verify'
  | 'tourStart'
  | 'tourReturn'
  | 'buildTour'
  | 'chooseStops'
  | 'scanQr'
  | 'arInit'
  | 'arLive'
  | 'guided'
  | 'stop'
  | 'tourComplete'
  | 'tourSummary'
  | 'wayfinding';

export type Overlay =
  | 'help'
  | 'itinerary'
  | 'addStop'
  | 'note'
  | 'video'
  | 'book'
  | 'aiChat'
  | 'apply'
  | 'notifications'
  | 'settings'
  | 'history'
  | 'placePicker'
  | 'floorPicker'
  | 'leaveTour'
  | 'skip'
  | 'sos'
  | 'report'
  | 'upcoming'
  | 'checkin'
  | 'call'
  | 'chatOptions'
  | 'location'
  | 'qr'
  | 'link'
  | 'guestGate'
  | 'addUnits'
  | 'preview'
  | 'gallery'
  | 'pano'
  | 'share'
  | 'saved'
  | 'passes';

/** Screens with the Home / Properties / Profile tab bar. */
export const TABBED_SCREENS: Screen[] = ['home', 'search', 'profile'];

/** Screens drawn over a photo or black, where the status bar must be light-on-dark. */
export const DARK_SCREENS: Screen[] = ['scanQr', 'arInit', 'arLive'];

export const isTabbed = (screen: Screen): boolean => TABBED_SCREENS.includes(screen);

/** Overlays stack in this order (later = on top), as the reference's z-indexes do. */
export const OVERLAY_ORDER: Overlay[] = [
  'help',
  'itinerary',
  'note',
  'video',
  'addStop',
  'upcoming',
  'addUnits',
  'saved',
  'passes',
  'notifications',
  'settings',
  'history',
  'apply',
  'aiChat',
  'book',
  'pano',
  'share',
  'guestGate',
  'link',
  'checkin',
  'call',
  'chatOptions',
  'location',
  'qr',
  'sos',
  'report',
  'skip',
  'preview',
  'gallery',
  'placePicker',
  'floorPicker',
  'leaveTour'
];

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
export const backScreenOf = (screen: Screen, tourMode: 'self' | 'ar', context: { checkedIn?: boolean; virtualTour?: boolean } = {}): Screen | null => {
  switch (screen) {
    case 'splash':
    case 'onboarding':
    case 'getStarted':
    case 'home':
      return null;
    case 'search':
    case 'profile':
    case 'schedule':
    case 'verify':
    case 'tourStart':
    case 'scanQr':
    case 'wayfinding':
    case 'tourSummary':
      return 'home';
    case 'explore':
      return 'search';
    case 'buildTour':
      return context.checkedIn || context.virtualTour ? 'tourStart' : 'home';
    case 'arInit':
      return 'scanQr';
    case 'chooseStops':
      return 'arInit';
    case 'arLive':
      return 'chooseStops';
    case 'guided':
      return tourMode === 'ar' ? 'arLive' : 'buildTour';
    case 'stop':
    case 'tourReturn':
      return 'guided';
    case 'tourComplete':
      return 'home';
    default:
      return 'home';
  }
};
