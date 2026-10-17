import type { HelpItem, OnboardingSlide } from '~/models';

/**
 * App copy: text that belongs to the Pynwheel Tour app itself, not to any
 * property's data (onboarding, help, the AR initialisation labels, the
 * concierge's prompts). The real-data provider serves these; the dummy
 * provider keeps its own marked copies. Updated October 17, 2026 to the
 * design refresh's wording.
 */

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  { id: 'home', title: 'Looking for a new place to call home?', body: 'Schedule a tour or visit at your leisure. Customize your tour with the units and amenities you want to see.' },
  { id: 'notes', title: 'Add your own photos and notes', body: 'A built-in camera and notepad let you personalize your tour, and you can review it all at any time.' },
  { id: 'access', title: 'Access model units and common areas', body: 'Automated wayfinding and on-screen access instructions guide you through your tour.' }
];

export const AR_INIT_LABELS = ['Connecting To GPS...', 'GPS Location Locked', 'Loading Property Blueprint...', 'Calibrating AR Anchors...', 'Launching AR Camera...'];

export const HELP_ITEMS: HelpItem[] = [
  { id: 'start', question: 'How To Start A Tour', answer: 'From Home, tap Start Self-Tour to schedule, then check in on arrival and pick your stops.' },
  { id: 'schedule', question: 'Scheduling A Self-Tour', answer: 'Pick a day, time and tour length in the app. Tours booked on the property website or lobby kiosk show up here too, under Upcoming tours.' },
  { id: 'verify', question: 'Verifying Your Identity', answer: 'Scan the front of your government ID and take a selfie with CheckpointID. Some properties also hold a card on file. Nothing is charged. Verification is valid at all Pynwheel communities for 12 months.' },
  { id: 'property', question: 'Changing The Property', answer: 'Open Properties to see every property you can tour and tap one to switch. Properties without the Self-Guided Tour are listed but cannot be toured.' },
  { id: 'ble', question: 'Slide To Unlock', answer: 'Turn on Bluetooth, hold your phone near the reader and slide the lock control. The door re-locks automatically when you leave.' },
  { id: 'pin', question: 'Using A PIN Code', answer: 'Some doors and keyboxes use a temporary PIN. Enter it on the keypad, then press #. The code stops working when your access window ends.' },
  { id: 'remote', question: 'Remote Unlock', answer: 'Tap Unlock door and wait a couple of seconds. You have 30 seconds to push the door open before it re-locks.' },
  { id: 'gate', question: 'Opening A Gate Or Garage', answer: 'Pull up to the gate, tap Open gate and wait for it to fully open before driving in. The gate closes automatically behind you.' }
];

export const SUPPORT_EMAIL = 'support@pynwheel.com';

export const CONCIERGE_PROMPTS: { label: string; question: string }[] = [
  { label: 'Pet policy?', question: 'What is the pet policy?' },
  { label: 'Parking cost?', question: 'How much is parking?' },
  { label: 'Lease terms?', question: 'What lease terms are available?' },
  { label: 'Pricing?', question: 'What does it cost?' }
];

/** Prompts for a stop (the design's unit / amenity sets). */
export const CONCIERGE_PROMPTS_UNIT: { label: string; question: string }[] = [
  { label: 'Total move-in cost?', question: 'What is the total move-in cost?' },
  { label: 'Lease terms?', question: 'What lease terms are available?' },
  { label: 'Hold this unit', question: 'Hold this unit for me' }
];
export const CONCIERGE_PROMPTS_AMENITY: { label: string; question: string }[] = [
  { label: 'Hours?', question: 'What are the hours?' },
  { label: 'Is it included in rent?', question: 'Is it included in rent?' },
  { label: 'Pet policy?', question: 'What is the pet policy?' }
];

export const CONCIERGE_GREETING_STOP = 'Hi! I’m your tour concierge. Ask me anything about {stop} or {property}.';
export const CONCIERGE_GREETING_GENERAL = 'Hi! I’m your tour concierge. Ask me anything about {property}.';
export const CONCIERGE_GREETING_GUEST = 'Hi! I’m the Pynwheel assistant. Sign in and choose a property to ask about its units, pricing and amenities.';
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

export const APP_VERSION = '1.1.0';
