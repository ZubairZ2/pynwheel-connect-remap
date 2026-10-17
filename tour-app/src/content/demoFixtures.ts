import communityPhoto from '~/assets/images/community-pool.jpg';
import aerialPhoto from '~/assets/images/pool-aerial.jpg';
import sitePlan from '~/assets/images/site-plan.png';

/**
 * Demonstration data for the design refresh's UI-only features (section 12
 * of the October 17 brief): the nearby / featured listings a guest sees,
 * the sister communities on the summary, saved units from other properties,
 * the extra "upcoming tours" of the Multiple scenario, and the copy of the
 * simulated flows. Every value here is local, marked with the trailing `*`
 * where it reaches the screen, and never mixed into the property bundle the
 * API provides.
 */

export const DEMO = ' *';

export interface DemoListing {
  id: string;
  name: string;
  address: string;
  beds: string;
  minBed: number;
  maxBed: number;
  from: number;
  dist: string;
  img: string;
}

/** The design's `NEARBY`: featured communities for a guest (no account, no property list). */
export const DEMO_LISTINGS: DemoListing[] = [
  { id: 'demo-luxe', name: 'Luxe Mile High', address: '3401 Blake St, Denver, CO', beds: 'Studio–3 bed', minBed: 0, maxBed: 3, from: 1850, dist: '0.2 mi', img: sitePlan },
  { id: 'demo-wynkoop', name: 'Wynkoop Lofts', address: '1720 Wynkoop St, Denver, CO', beds: 'Studio–2 bed', minBed: 0, maxBed: 2, from: 1695, dist: '0.4 mi', img: communityPhoto },
  { id: 'demo-blake', name: 'Blake Street Commons', address: '2900 Blake St, Denver, CO', beds: '1–3 bed', minBed: 1, maxBed: 3, from: 2050, dist: '0.6 mi', img: aerialPhoto },
  { id: 'demo-rino', name: 'RiNo Yards', address: '3500 Walnut St, Denver, CO', beds: '1–2 bed', minBed: 1, maxBed: 2, from: 1890, dist: '0.8 mi', img: communityPhoto },
  { id: 'demo-larimer', name: 'Larimer Flats', address: '2750 Larimer St, Denver, CO', beds: 'Studio–1 bed', minBed: 0, maxBed: 1, from: 1525, dist: '1.1 mi', img: aerialPhoto },
  { id: 'demo-ballpark', name: 'Ballpark Residences', address: '2100 Market St, Denver, CO', beds: '2–3 bed', minBed: 2, maxBed: 3, from: 2780, dist: '1.3 mi', img: sitePlan }
];

export interface DemoSisterProperty {
  id: string;
  name: string;
  address: string;
  meta: string;
  img: string;
}

export const DEMO_SISTER_PROPERTIES: DemoSisterProperty[] = [
  { id: 'union', name: 'Luxe Union Station', address: '1701 Wynkoop St, Denver, CO', meta: '1–3 bed · from $1,950 · 1.0 mi', img: communityPhoto },
  { id: 'cherry', name: 'Luxe Cherry Creek', address: '250 Columbine St, Denver, CO', meta: 'Studio–2 bed · from $1,725 · 3.4 mi', img: aerialPhoto }
];

export interface DemoSavedUnit {
  name: string;
  property: string;
  meta: string;
}

export const DEMO_SAVED_ELSEWHERE: DemoSavedUnit[] = [
  { name: 'Unit 3B', property: 'Irvine Spectrum', meta: '$3,150/mo · 2 Bed · 2 Bath' },
  { name: 'Studio 512', property: 'Luxe Cherry Creek', meta: '$1,725/mo · Studio' }
];

/** The extra tours of the "Multiple upcoming tours" scenario. */
export interface DemoExtraTour {
  id: string;
  name: string;
  address: string;
  img: string;
  dayLabel: string;
  time: string;
  length: number;
  pill: string;
  tone: 'primary' | 'warn';
  scenario: 'early' | 'pending';
}

export const DEMO_EXTRA_TOURS: DemoExtraTour[] = [
  { id: 'x1', name: 'Wynkoop Lofts', address: '1720 Wynkoop St, Denver, CO', img: communityPhoto, dayLabel: 'Sat, Oct 17', time: '11:30 AM', length: 45, pill: 'Scheduled', tone: 'primary', scenario: 'early' },
  { id: 'x2', name: 'RiNo Yards', address: '3500 Walnut St, Denver, CO', img: aerialPhoto, dayLabel: 'Mon, Oct 19', time: '5:00 PM', length: 30, pill: 'Waiting for approval', tone: 'warn', scenario: 'pending' }
];

/** Self-tour slots a property offers (the booking backend is not part of this phase). */
export const DAY_SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:00 PM'];
export const AFTER_HOURS_SLOTS = ['6:00 PM', '7:00 PM', '8:00 PM'];
export const TOUR_LENGTHS = [30, 45, 60];
export const PARTY_MAX = 6;
/** Door access window once checked in, and how long one extension adds. */
export const ACCESS_MINUTES = 45;
export const EXTEND_MINUTES = 10;
export const HOLD_HOURS = 48;

export const LEASING_PHONE = '(303) 555-0100';
export const LEASING_EMAIL = 'leasing@example.com';

export const FINISHES = ['Quartz countertops', 'Stainless steel appliances', 'In-unit washer & dryer', 'Wide-plank vinyl flooring', 'Floor-to-ceiling windows'];

export const HOW_SELF_TOURING_WORKS = [
  { n: '1', title: 'Pick a property and a time', sub: 'Any day, including evenings' },
  { n: '2', title: 'Verify your ID once', sub: 'About a minute with ID and selfie' },
  { n: '3', title: 'Unlock doors from your phone', sub: 'Follow the route at your own pace' }
];

export const GUEST_PERKS = ['Schedule self-tours and unlock doors', 'Save and compare units', 'Keep your tour history'];

export const SKIP_REASONS: { id: string; label: string }[] = [
  { id: 'lock', label: "Door or lock isn't working" },
  { id: 'closed', label: 'Area is closed or occupied' },
  { id: 'find', label: "I can't find it" },
  { id: 'skip', label: "I'm not interested in this stop" }
];

export const REPORT_OPTIONS = ["Door or gate won't open", 'Unit not as described', 'Safety concern', 'Something else'];

export const LINK_STEPS = [
  'Open the listing (Zillow, Apartments.com, the property website) or the email from the leasing team.',
  'Tap "Self-tour" or "Tour now" and copy the link it gives you.',
  'Paste it below. Links start with tour.pynwheel.com.'
];

export const BEST_MATCH_REASONS = ['Available Now', 'Near Fitness + Pool', 'Fits Your Budget'];

/** Lease-term pricing as a multiple of the 12-month rent (demo: the API publishes one rent). */
export const LEASE_TERM_FACTORS: Record<3 | 6 | 9 | 12, number> = { 3: 1.15, 6: 1.08, 9: 1.04, 12: 1 };
/** Deposit and fees of the move-in estimate (demo). */
export const MOVE_IN_FEES: { label: string; amount: number }[] = [
  { label: 'Security deposit', amount: 500 },
  { label: 'Admin fee', amount: 250 },
  { label: 'Application fee', amount: 50 }
];
