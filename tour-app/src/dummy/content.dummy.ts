/**
 * DUMMY DATA — everything the reference app shows that is not the map:
 * the visitor, listings, history, onboarding copy, help, the AI concierge's
 * canned answers and the booking choices. Every visible value carries `*`
 * where it reaches the screen (the strings here that are shown verbatim
 * already include it).
 */

import type { ConciergeAnswer, HelpItem, Listing, OnboardingSlide, PropertyListing, TourHistoryEntry, Visitor } from '~/models';

export const VISITOR: Visitor = {
  name: 'Alex Johnson *',
  initials: 'A',
  email: 'alex@example.com *',
  phone: '(303) 555-0148 *'
};

export const FIRST_NAME = 'Alex *';

export const NEARBY_PROPERTIES: PropertyListing[] = [
  { id: 1, name: 'Luxe Mile High *', address: '3401 Blake St, Denver, CO *', current: true, tourable: true },
  { id: 2, name: 'Irvine Spectrum *', address: '1 Spectrum Center, Irvine, CA *', current: false, tourable: false }
];

export const HI_RISE_LISTINGS: Listing[] = [
  { name: 'The Millennium Tower *', address: '301 Mission St, San Francisco, CA', meta: '58 Floors · Luxury Hi-Rise' },
  { name: 'Panorama Tower *', address: '1101 Brickell Bay Dr, Miami, FL', meta: '85 Floors · Waterfront Views' },
  { name: 'One Manhattan Square *', address: '252 South St, New York, NY', meta: '72 Floors · River Views' },
  { name: 'The Austonian *', address: '200 Congress Ave, Austin, TX', meta: '56 Floors · Downtown Core' },
  { name: 'Legacy Union One *', address: '200 S Tryon St, Charlotte, NC', meta: '36 Floors · Uptown Views' },
  { name: 'SkyHouse Chicago *', address: '710 N Wabash Ave, Chicago, IL', meta: '40 Floors · Lake Views' }
];

export const TOUR_HISTORY: TourHistoryEntry[] = [{ id: 'h1', property: 'Irvine Spectrum *', date: 'Oct 12 *', tags: ['Swimming Pool *', 'Unit 204 *', 'Fitness Center *'] }];

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'home',
    title: 'Looking For A New Place To Call Home?',
    body: 'Schedule tours or visit at your leisure. Customize your tour with the units and amenities you want to see.'
  },
  { id: 'ar', title: 'Explore In Augmented Reality', body: 'Scan the QR code in the lobby to unlock guided AR wayfinding through the building.' },
  { id: 'self', title: 'Self-Guided, At Your Pace', body: 'Unlock select units with your phone and explore amenities without waiting for an agent.' }
];

export const AR_INIT_LABELS = ['Connecting To GPS...', 'GPS Location Locked', 'Loading Property Blueprint...', 'Calibrating AR Anchors...', 'Launching AR Camera...'];

export const HELP_ITEMS: HelpItem[] = [
  {
    id: 'start',
    question: 'How To Start A Tour',
    answer: 'From Home, tap Start Self-Tour to pick your stops, or scan the lobby QR to launch AR Mode. We route you automatically.'
  },
  { id: 'ar', question: 'Using AR Mode', answer: 'Point your camera at the lobby QR code. Once calibrated, follow the on-screen pins and the highlighted path to each stop.' },
  { id: 'unlock', question: 'Unlocking A Unit', answer: 'At a unit stop, slide the unlock control. Our Bluetooth smart lock opens the door for the duration of your tour.' }
];

export const SUPPORT_EMAIL = 'support@pynwheel.com';

export const CONCIERGE_ANSWERS: ConciergeAnswer[] = [
  {
    keywords: ['pet', 'dog', 'cat'],
    answer: '{property} is pet-friendly — up to 2 pets per home, no weight limit. There is a $300 pet deposit and $35/mo pet rent, plus an on-site dog park in Tower B. *'
  },
  { keywords: ['park', 'garage'], answer: 'Covered garage parking is $150/mo per space, with a limited number of EV charging stalls. Guest parking is free in the north lot. *' },
  {
    keywords: ['price', 'rent', 'cost', 'much'],
    answer: 'Available units at {property} start at $1,850/mo for 1 beds and $2,400/mo for 2 beds. I can send you the full price sheet — just say the word. *'
  },
  { keywords: ['hour', 'open', 'close'], answer: 'Amenities are open 5:00 AM–11:00 PM daily. The pool closes at 10 PM, and the fitness center is 24/7 for residents. *' },
  {
    keywords: ['lease', 'term', 'deposit'],
    answer: 'We offer 3, 6, 9, and 12-month terms. A 12-month lease has the best rate, and the security deposit is one month’s rent (or $0 down with approved credit). *'
  },
  { keywords: ['gym', 'fitness'], answer: 'The Fitness Center on the 1st floor has Peloton bikes, free weights up to 90 lb, a squat rack, and a yoga studio. It is open 24/7 for residents. *' },
  { keywords: ['pool', 'swim'], answer: 'The rooftop Swimming Pool is heated year-round, with cabanas, a hot tub, and a grilling lounge. It is a favorite on tour! *' },
  { keywords: ['apply', 'application'], answer: 'You can apply right from your Tour Summary — the application takes about 5 minutes and the fee is $50. Want me to take you there? *' },
  { keywords: ['available', 'move'], answer: '{stop} is available now. The earliest move-in is within 3 days of an approved application. *' }
];

export const CONCIERGE_FALLBACK =
  'Great question about {stop}. A leasing specialist can confirm the details — in the meantime, you can take notes on this stop or ask me about pricing, pet policy, parking, amenities, or lease terms. *';

export const CONCIERGE_GREETING_STOP = 'Hi! I’m your AI tour concierge. Ask me anything about {stop} or {property}. *';
export const CONCIERGE_GREETING_GENERAL = 'Hi! I’m your AI tour concierge. Ask me anything about {property} — pricing, pet policy, amenities, or lease terms. *';
export const CONCIERGE_HUMAN_REPLY =
  'I’ve connected you with the on-site leasing team — a specialist will reply here in just a moment. You can keep touring in the meantime. *';

export const CONCIERGE_PROMPTS: { label: string; question: string }[] = [
  { label: 'Pet policy?', question: 'What is the pet policy?' },
  { label: 'Parking cost?', question: 'How much is parking?' },
  { label: 'Lease terms?', question: 'What lease terms are available?' },
  { label: 'Pricing?', question: 'What does it cost?' }
];

export const BOOKING_DAYS = ['Wed, Jul 23 *', 'Thu, Jul 24 *', 'Fri, Jul 25 *', 'Sat, Jul 26 *'];
export const BOOKING_TIMES = ['10:00 AM *', '12:00 PM *', '2:30 PM *', '4:00 PM *'];

export const BEST_MATCH_REASONS = ['Available Now *', 'Near Fitness + Pool *', 'Fits Your Budget *'];
export const BEST_MATCH_PERCENT = 92;

export const APP_VERSION = '5.0.1 *';
