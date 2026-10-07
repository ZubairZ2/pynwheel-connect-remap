import type { HelpItem, OnboardingSlide } from '~/models';

/**
 * App copy: text that belongs to the Pynwheel Tour app itself, not to any
 * property's data (onboarding, help, the AR initialisation labels, the
 * concierge's prompts). The real-data provider serves these; the dummy
 * provider keeps its own marked copies.
 */

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  { id: 'home', title: 'Looking For A New Place To Call Home?', body: 'Schedule tours or visit at your leisure. Customize your tour with the units and amenities you want to see.' },
  { id: 'ar', title: 'Explore In Augmented Reality', body: 'Scan the QR code in the lobby to unlock guided AR wayfinding through the building.' },
  { id: 'self', title: 'Self-Guided, At Your Pace', body: 'Unlock select units with your phone and explore amenities without waiting for an agent.' }
];

export const AR_INIT_LABELS = ['Connecting To GPS...', 'GPS Location Locked', 'Loading Property Blueprint...', 'Calibrating AR Anchors...', 'Launching AR Camera...'];

export const HELP_ITEMS: HelpItem[] = [
  { id: 'start', question: 'How To Start A Tour', answer: 'From Home, tap Start Self-Tour to pick your stops, or scan the lobby QR to launch AR Mode. We route you automatically.' },
  { id: 'property', question: 'Changing The Property', answer: 'Open Search to see every property you can tour and tap one to switch. Properties without the Self-Guided Tour are listed but cannot be toured.' },
  { id: 'ar', question: 'Using AR Mode', answer: 'Point your camera at the lobby QR code. Once calibrated, follow the on-screen pins and the highlighted path to each stop.' },
  { id: 'unlock', question: 'Unlocking A Unit', answer: 'At a unit stop, slide the unlock control. Smart-lock access depends on the property’s lock provider.' }
];

export const SUPPORT_EMAIL = 'support@pynwheel.com';

export const CONCIERGE_PROMPTS: { label: string; question: string }[] = [
  { label: 'Pet policy?', question: 'What is the pet policy?' },
  { label: 'Parking cost?', question: 'How much is parking?' },
  { label: 'Lease terms?', question: 'What lease terms are available?' },
  { label: 'Pricing?', question: 'What does it cost?' }
];

export const CONCIERGE_GREETING_STOP = 'Hi! I’m your tour concierge. Ask me anything about {stop} or {property}.';
export const CONCIERGE_GREETING_GENERAL = 'Hi! I’m your tour concierge. Ask me anything about {property}.';
export const CONCIERGE_NOT_CONNECTED = 'The concierge is not connected to {property} yet, so I can’t answer that here. The leasing team can help with questions about {stop}.';
export const CONCIERGE_HUMAN_REPLY = 'A leasing specialist is not connected to this app yet. Please contact the property directly.';

/** The next `count` days from today, as the booking sheet lists them ("Wed, Jul 23"). */
export const upcomingDays = (count = 4, from: Date = new Date()): string[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });

export const BOOKING_TIMES = ['10:00 AM', '12:00 PM', '2:30 PM', '4:00 PM'];

export const APP_VERSION = '1.0.0';
