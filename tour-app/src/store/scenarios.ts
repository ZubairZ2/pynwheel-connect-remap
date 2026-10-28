import { ACCESS_MINUTES, DEMO, DEMO_EXTRA_TOURS, type DemoExtraTour } from '~/content/demoFixtures';
import type { AppState, BookingState, DemoLocationScenario, DemoTourScenario, ScheduledTour } from './appState';
import { dayKeyInZone, dayOffsetInZone, zonedSlotMs } from './zone';

/** The CMS's default grace period (`tours.grace_period`), used until the property's booking rules are read. */
export const DEFAULT_GRACE_MINUTES = 10;

/** The property's grace period in minutes, from the booking rules when they are loaded. */
export const graceMinutesOf = (state: { booking?: Pick<BookingState, 'settings'> | null }): number => {
  const grace = state.booking?.settings?.gracePeriod;
  return typeof grace === 'number' && grace > 0 ? grace : DEFAULT_GRACE_MINUTES;
};

/**
 * When the tour starts, as an instant: the CMS's `booked_at` when the
 * booking carries one, else the wall clock read in the property's zone, else
 * (demo / local tours) the phone's zone (October 25, 2026).
 */
export const tourStartMs = (tour: Pick<ScheduledTour, 'date' | 'time' | 'bookedAtMs' | 'timeZone'>): number => tour.bookedAtMs ?? zonedSlotMs(tour.date, tour.time, tour.timeZone ?? null);

/** "Today, Oct 25" / "Tomorrow, Oct 25" / "Sat, Oct 24", relative to now in the property's zone (the phone's when the tour has none). */
export const tourDayLabel = (tour: Pick<ScheduledTour, 'date' | 'time' | 'bookedAtMs' | 'timeZone'>, now: number): string => {
  const tz = tour.timeZone ?? null;
  const key = tour.bookedAtMs != null && tz ? dayKeyInZone(tour.bookedAtMs, tz) : tour.date;
  const off = tz ? dayOffsetInZone(key, tz, now) : dayOffset(key, new Date(now));
  const d = parseDay(key);
  const prefix = off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : off === -1 ? 'Yesterday' : DOW[d.getDay()];
  return `${prefix}, ${MON[d.getMonth()]} ${d.getDate()}`;
};

/**
 * The design's Tweaks, resolved against the app's own state. Each function
 * is pure: given the state (and the clock) it says which variant of a card
 * or sheet to draw. The owner can force any variant from Settings › Demo
 * scenarios; `auto` derives it from what actually happened in the app (a
 * self-tour booked locally, the location permission the visitor gave …).
 */

export type TourCardTone = 'primary' | 'live' | 'warn' | 'muted' | 'danger';

export type TourScenario = Exclude<DemoTourScenario, 'auto'>;

export interface TourCardModel {
  scenario: TourScenario;
  label: string;
  countdown: string;
  dateLabel: string;
  timeLabel: string;
  cta: string;
  tone: TourCardTone;
  /** Whether the Verified / Booked-via line shows. */
  meta: boolean;
  note: string | null;
  /** What the primary button does. */
  action: 'checkin' | 'view' | 'book' | 'reschedule' | 'continue';
  /** The confirm-profile card's pill. */
  pill: string;
  pillTone: TourCardTone;
  confirmNote: string | null;
  /** The confirm-profile card's title line. */
  confirmTitle: string;
}

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `YYYY-MM-DD` → local midnight. */
export const parseDay = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const dayOffset = (key: string, now: Date = new Date()): number => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDay(key).getTime() - today.getTime()) / 86400000);
};

/** "Today, Oct 17" / "Tomorrow, Oct 18" / "Sat, Oct 24". */
export const dayLabel = (key: string, now: Date = new Date()): string => {
  const d = parseDay(key);
  const off = dayOffset(key, now);
  const prefix = off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : off === -1 ? 'Yesterday' : DOW[d.getDay()];
  return `${prefix}, ${MON[d.getMonth()]} ${d.getDate()}`;
};

/** The slot's moment in local time, from the day key and "6:00 PM". */
export const slotTime = (key: string, time: string): number => {
  const d = parseDay(key);
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(time || '');
  if (!m) return d.getTime();
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  d.setHours(h, Number(m[2]), 0, 0);
  return d.getTime();
};

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const fmtClock = (ms: number): string => {
  const t = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(t / 60)}:${pad2(t % 60)}`;
};

export const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad2(d.getMinutes())} ${ap}`;
};

export const fmtCountdown = (ms: number): string => {
  if (ms <= 0) return 'Check-in open';
  const m = Math.floor(ms / 60000);
  if (m >= 1440) {
    const d = Math.round(m / 1440);
    return `In ${d} ${d === 1 ? 'day' : 'days'}`;
  }
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  return `Starts in ${h > 0 ? `${h}:${pad2(mm)}` : mm}:${pad2(ss)}`;
};

/**
 * The scenario the app's own state is in (the `auto` case). Since October 25,
 * 2026 the window is the CMS's: a booking can be started from `grace`
 * minutes before its time to `grace` minutes after (`Visits::Start` refuses
 * a check-in outside it), it is *upcoming* before that window whatever the
 * calendar says, and *missed* once the window has passed without a check-in
 * (the CMS's own "missed"). The instant is the property's, never the phone's.
 */
export const autoTourScenario = (tour: ScheduledTour | null, now: number, graceMinutes = DEFAULT_GRACE_MINUTES): TourScenario => {
  if (!tour) return 'none';
  if (tour.status === 'cancelled') return 'cancelled';
  if (tour.status === 'past') return 'past';
  if (tour.status === 'pending') return 'pending';
  if (tour.status === 'checkedIn') return 'today';
  const start = tourStartMs(tour);
  const grace = graceMinutes * 60000;
  if (now > start + grace) return 'missed';
  return now >= start - grace ? 'today' : 'upcoming';
};

type ScenarioState = Pick<AppState, 'demo' | 'scheduledTour'> & { booking?: Pick<BookingState, 'settings'> | null };

export const resolveTourScenario = (state: ScenarioState, now: number): TourScenario => (state.demo.tour === 'auto' ? autoTourScenario(state.scheduledTour, now, graceMinutesOf(state)) : state.demo.tour);

/** A tour to describe when the scenario is forced but nothing was booked (the design's `WEB_TOUR`: booked on the property website). */
export const placeholderTour = (scenario: TourScenario, now: number, unit: string): ScheduledTour => {
  const dateFor = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const base: ScheduledTour = { id: 'web-demo', status: 'scheduled', date: dateFor(0), time: '6:00 PM', length: 45, unit, party: 1, source: 'website', createdAt: now };
  switch (scenario) {
    case 'upcoming':
    case 'pending':
    case 'cancelled':
      return { ...base, date: dateFor(2), status: scenario === 'pending' ? 'pending' : scenario === 'cancelled' ? 'cancelled' : 'scheduled' };
    case 'past':
      return { ...base, date: dateFor(-5), time: '4:00 PM', status: 'past' };
    case 'missed':
      return { ...base, date: dateFor(-1), time: '2:00 PM', status: 'missed' };
    default:
      return base;
  }
};

export const effectiveTour = (state: ScenarioState & Pick<AppState, 'schedule'>, now: number): { scenario: TourScenario; tour: ScheduledTour | null } => {
  const scenario = resolveTourScenario(state, now);
  if (scenario === 'none') return { scenario, tour: null };
  const own = state.scheduledTour;
  const ownScenario = autoTourScenario(own, now, graceMinutesOf(state));
  const tour = own && (state.demo.tour === 'auto' || ownScenario === scenario) ? own : placeholderTour(scenario, now, own?.unit || state.schedule.unit || 'No preference');
  return { scenario, tour };
};

export const tourCard = (state: ScenarioState & Pick<AppState, 'schedule' | 'checkedIn' | 'accessEndsAt'>, now: number, where: string): TourCardModel | null => {
  const { scenario, tour } = effectiveTour(state, now);
  if (!tour || scenario === 'none') return null;
  const start = tourStartMs(tour);
  const len = ` · ${tour.length} min`;
  const date = tourDayLabel(tour, now);
  const time = `${tour.time}${len}`;
  const checkedIn = state.checkedIn && (scenario === 'today' || tour.status === 'checkedIn');
  switch (scenario) {
    case 'today':
      return {
        scenario,
        label: "Today's tour",
        countdown: checkedIn ? `Checked in · ${fmtClock((state.accessEndsAt ?? now) - now)} left` : fmtCountdown(start - now),
        dateLabel: date,
        timeLabel: time,
        cta: checkedIn ? 'Continue Tour' : 'Start Tour',
        tone: checkedIn ? 'live' : 'primary',
        meta: true,
        note: null,
        action: checkedIn ? 'continue' : 'checkin',
        pill: 'Check in when you arrive',
        pillTone: 'live',
        confirmNote: 'Door access opens when you check in at the property.',
        confirmTitle: `Today · ${tour.time}`
      };
    case 'upcoming':
      return {
        scenario,
        label: 'Upcoming tour',
        countdown: fmtCountdown(start - now),
        dateLabel: date,
        timeLabel: time,
        cta: 'View Tour Details',
        tone: 'primary',
        meta: true,
        note: null,
        action: 'view',
        pill: tour.source === 'app' ? 'Booked in the app' : 'Booked on the property website',
        pillTone: 'primary',
        confirmNote: null,
        confirmTitle: `${date} · ${tour.time}`
      };
    case 'pending':
      return {
        scenario,
        label: 'Tour request',
        countdown: 'Awaiting approval',
        dateLabel: date,
        timeLabel: time,
        cta: 'View Request',
        tone: 'warn',
        meta: false,
        note: "The leasing team is reviewing your request. You'll get a text once it's confirmed.",
        action: 'view',
        pill: 'Waiting for property approval',
        pillTone: 'warn',
        confirmNote: "You'll get a text as soon as the leasing team confirms.",
        confirmTitle: `${date} · ${tour.time}`
      };
    case 'past':
      return {
        scenario,
        label: 'Last tour',
        countdown: 'Completed',
        dateLabel: date,
        timeLabel: time,
        cta: 'Book Another Tour',
        tone: 'muted',
        meta: false,
        note: `${where}${DEMO}`,
        action: 'book',
        pill: 'Completed',
        pillTone: 'muted',
        confirmNote: 'Your photos, notes and saved units are on Home. Book another tour any time.',
        confirmTitle: `${date} · ${tour.time}`
      };
    case 'missed':
      return {
        scenario,
        label: 'Missed tour',
        countdown: 'Window passed',
        dateLabel: date,
        timeLabel: time,
        cta: 'Reschedule',
        tone: 'warn',
        meta: false,
        note: "No problem. Pick a new time and we'll hold it for you.",
        action: 'reschedule',
        pill: 'Tour window passed',
        pillTone: 'warn',
        confirmNote: 'No problem. You can pick a new time from Home.',
        confirmTitle: `${date} · ${tour.time}`
      };
    case 'cancelled':
      return {
        scenario,
        label: 'Cancelled tour',
        countdown: 'Cancelled',
        dateLabel: date,
        timeLabel: time,
        cta: 'Book a New Time',
        tone: 'danger',
        meta: false,
        note: 'This tour was cancelled. Pick a new time whenever you are ready.',
        action: 'book',
        pill: 'Cancelled by the property',
        pillTone: 'danger',
        confirmNote: 'The leasing team had to cancel this time. Book a new one from Home.',
        confirmTitle: `${date} · ${tour.time}`
      };
    default:
      return null;
  }
};

// ───────── Location ─────────

export type LocationScenario = Exclude<DemoLocationScenario, 'auto'> | 'notAsked' | 'on';

export interface LocationModel {
  scenario: LocationScenario;
  perm: 'ask' | 'on' | 'off';
  /** Whether the visitor counts as being at the property. */
  atProperty: boolean;
  warn: boolean;
  line: string;
  lineSub: string;
  manageSub: string;
  primaryLabel: string;
  primaryAction: 'refresh' | 'qr' | 'settings';
  nearTitle: string;
  nearNeedsLocation: boolean;
  offTitle: string;
  offSub: string;
  offCta: string;
}

export const resolveLocationScenario = (state: Pick<AppState, 'demo' | 'location'>): LocationScenario => {
  if (state.demo.location !== 'auto') return state.demo.location;
  return state.location.perm === 'on' ? 'on' : state.location.perm === 'off' ? 'denied' : 'notAsked';
};

export const locationModel = (state: Pick<AppState, 'demo' | 'location' | 'checkedIn' | 'guestProperty'>, propertyName: string, address: string): LocationModel => {
  const scenario = resolveLocationScenario(state);
  const perm: LocationModel['perm'] = scenario === 'denied' ? 'off' : scenario === 'notAsked' ? 'ask' : 'on';
  const street = address.split(',')[0] || address;
  const atProperty = scenario === 'atProperty' || (scenario !== 'nearby' && perm === 'on' && (state.checkedIn || state.guestProperty === 'near' || state.guestProperty === 'qr'));
  const base = atProperty
    ? { line: `You're at ${propertyName}${DEMO}`, lineSub: '', manageSub: 'Detected from your location. Not right? Refresh, scan the QR code on site, or search for the property.', primaryLabel: 'Refresh Location', primaryAction: 'refresh' as const }
    : { line: `0.3 mi from ${propertyName}${DEMO}`, lineSub: `· ${street}`, manageSub: "Showing the closest property. If you're already there, refresh or scan the QR code at the entrance.", primaryLabel: 'Refresh Location', primaryAction: 'refresh' as const };
  const variants: Partial<Record<LocationScenario, Pick<LocationModel, 'line' | 'lineSub' | 'manageSub' | 'primaryLabel' | 'primaryAction'>>> = {
    approximate: { line: `~ Near ${street}${DEMO}`, lineSub: '· Approximate', manageSub: "Your signal is weak, so we can't tell exactly where you are. This often happens indoors. Scan the QR code at the entrance to confirm the property.", primaryLabel: 'Scan QR Code to Confirm', primaryAction: 'qr' },
    offline: { line: `Last seen near ${street}${DEMO}`, lineSub: '· Offline', manageSub: `You're offline. We're showing where you were last: near ${street}. Garages and stairwells often lose signal. Move closer to an entrance and retry.`, primaryLabel: 'Retry', primaryAction: 'refresh' },
    preciseOff: { line: `Precise location off${DEMO}`, lineSub: '· Turn on', manageSub: "We can see your general area but not which building you're in. In your phone's Settings, go to Pynwheel, then Location, and turn on Precise Location.", primaryLabel: 'Open Settings', primaryAction: 'settings' }
  };
  const v = variants[scenario] ?? base;
  return {
    scenario,
    perm,
    atProperty,
    warn: !!variants[scenario],
    ...v,
    nearTitle: perm === 'on' ? 'Properties near you' : 'Featured properties',
    nearNeedsLocation: perm !== 'on' && !state.location.locating,
    offTitle: perm === 'off' ? 'Location is off' : 'Location not turned on',
    offSub: perm === 'off' ? 'Turn it on to find properties near you.' : 'Turn on to see where you are and nearby properties.',
    offCta: perm === 'off' ? 'Fix' : 'Turn on'
  };
};

// ───────── Check-in sheet ─────────

export type CheckinScenario = 'ready' | 'verify' | 'away' | 'active' | 'uncertain' | 'pending' | 'early';

export interface CheckinOption {
  title: string;
  sub: string;
  action: 'qr' | 'late' | 'reschedule' | 'cancel' | 'call' | 'verify' | 'startPoint' | 'endTour' | 'calendar' | 'close';
  danger?: boolean;
}

export interface CheckinStep {
  n: string;
  text: string;
  state: string;
  tone: 'ok' | 'now' | 'next';
}

export interface CheckinModel {
  scenario: CheckinScenario;
  tone: 'ok' | 'warn';
  title: string;
  sub: string;
  primary: string;
  primaryAction: 'start' | 'verify' | 'close' | 'resume' | 'chat' | 'calendar';
  options: CheckinOption[];
  steps: CheckinStep[] | null;
  warn: { title: string; body: string; cta: string; action: 'qr' | 'retry' | 'settings' } | null;
}

/** The visitor's ID is verified as far as the app knows: the simulated Verify Identity flow, or the demo switch. */
export const isVerified = (state: Pick<AppState, 'verified' | 'demo'>): boolean => state.verified || state.demo.idVerified;

/**
 * Whether the check-in must ask for the ID first (October 28, 2026). The
 * server decides: a property it answered `verification_required: false` for
 * goes straight to check-in. Until it has said (demo data), the sheet asks as
 * the design shows. The simulated flow and the demo switch clear the ask.
 */
export const needsIdVerification = (state: Pick<AppState, 'verified' | 'demo' | 'verificationRequired'>): boolean => state.verificationRequired !== false && !isVerified(state);

export const checkinModel = (
  state: ScenarioState & Pick<AppState, 'location' | 'checkedIn' | 'guestProperty' | 'verified' | 'verificationRequired' | 'accessEndsAt' | 'schedule' | 'checkinFor'>,
  now: number,
  propertyName: string,
  address: string,
  extra: DemoExtraTour | null
): CheckinModel => {
  const loc = locationModel(state, propertyName, address);
  const verified = !needsIdVerification(state);
  const { scenario: tourScenario, tour } = effectiveTour(state, now);
  let scenario: CheckinScenario;
  if (extra) scenario = extra.scenario;
  else if (state.checkedIn) scenario = 'active';
  else if (tourScenario === 'pending') scenario = 'pending';
  else if (tourScenario === 'upcoming') scenario = 'early';
  else if (loc.scenario === 'approximate' || loc.scenario === 'offline' || loc.scenario === 'preciseOff') scenario = 'uncertain';
  else if (!loc.atProperty) scenario = 'away';
  else scenario = !verified ? 'verify' : 'ready';
  const time = extra?.time ?? tour?.time ?? '6:00 PM';
  const name = extra?.name ?? propertyName;
  const dayText = extra?.dayLabel ?? (tour ? tourDayLabel(tour, now) : '');
  const grace = graceMinutesOf(state);
  const opt = (title: string, sub: string, action: CheckinOption['action'], danger = false): CheckinOption => ({ title, sub, action, danger });
  switch (scenario) {
    case 'ready':
      return { scenario, tone: 'ok', title: `You're at ${name}`, sub: `Your ${time} tour is ready. Check in to unlock doors for ${ACCESS_MINUTES} minutes.${DEMO}`, primary: 'Start In-Person Tour', primaryAction: 'start', steps: null, warn: null, options: [opt('Check in with the QR code', 'Use the code at the entrance if location is off', 'qr'), opt('Running late?', 'Let the leasing team know', 'late'), opt('Reschedule', 'Pick a different time', 'reschedule')] };
    case 'verify':
      return {
        scenario,
        tone: 'warn',
        title: 'One step before you check in',
        sub: 'Doors only open for verified visitors. It takes about a minute.',
        primary: 'Verify My ID',
        primaryAction: 'verify',
        steps: [
          { n: '1', text: 'Verify your ID', state: 'Required', tone: 'now' },
          { n: '2', text: 'Check in and start your tour', state: 'Next', tone: 'next' }
        ],
        warn: null,
        options: [opt('Call leasing', 'Questions about verification', 'call'), opt('Reschedule', 'Pick a different time', 'reschedule')]
      };
    case 'away':
      return {
        scenario,
        tone: 'warn',
        title: 'Start your tour once you arrive',
        sub: `You're 0.3 mi from ${name}. When you're at the property, tap Start Tour to check in and unlock doors.${DEMO}`,
        primary: 'Got It',
        primaryAction: 'close',
        steps: null,
        warn: null,
        options: [...(!verified ? [opt('Verify your ID on the way', 'Required before doors open. Takes about a minute.', 'verify')] : []), opt("I'm here, but location is wrong", 'Scan the QR code at the entrance instead', 'qr'), opt('Running late?', 'Let the leasing team know', 'late'), opt('Reschedule', 'Pick a different time', 'reschedule'), opt('Cancel tour', 'Free up your time slot', 'cancel', true)]
      };
    case 'active': {
      const left = Math.max(0, Math.round(((state.accessEndsAt ?? now) - now) / 60000));
      return {
        scenario,
        tone: 'ok',
        title: "You're checked in",
        sub: `Your tour at ${name} is in progress. Door access is active for ${left} more min.${DEMO}`,
        primary: 'Continue In-Person Tour',
        primaryAction: 'resume',
        steps: null,
        warn: null,
        options: [opt('Change starting point', 'Pick a different entrance', 'startPoint'), opt('Call leasing', 'Get help during your tour', 'call'), opt('End tour and check out', 'Turns off door access', 'endTour', true)]
      };
    }
    case 'uncertain': {
      const W: Record<string, [string, string, string, 'qr' | 'retry' | 'settings']> = {
        approximate: ["We can't confirm you're on site", "Your location is approximate. You can still start. If a door doesn't open, scan the QR code at the entrance.", 'Scan QR Code', 'qr'],
        offline: ["You're offline", "Doors need a connection to unlock. You can start now, but move near an entrance or Wi-Fi if a door doesn't respond.", 'Retry Connection', 'retry'],
        preciseOff: ['Precise location is off', "We can't confirm which building you're in. You can still start, or turn on Precise Location in Settings for the smoothest unlocks.", 'Open Settings', 'settings']
      };
      const w = W[loc.scenario] ?? W.approximate;
      return {
        scenario,
        tone: 'warn',
        title: !verified ? 'One step before you start' : 'Ready when you are',
        sub: `Your ${time} tour at ${name}.`,
        primary: !verified ? 'Verify My ID' : 'Start In-Person Tour',
        primaryAction: !verified ? 'verify' : 'start',
        steps: null,
        warn: { title: w[0], body: w[1], cta: w[2], action: w[3] },
        options: [...(loc.scenario === 'approximate' ? [] : [opt('Scan the QR code to confirm', 'Most reliable way to check in', 'qr')]), opt('Running late?', 'Let the leasing team know', 'late'), opt('Reschedule', 'Pick a different time', 'reschedule')]
      };
    }
    case 'pending':
      return {
        scenario,
        tone: 'warn',
        title: 'Your tour request',
        sub: `${dayText} · ${time} · ${name}. Most requests are approved within 2 business hours.`,
        primary: !verified ? 'Verify ID to Speed Up Approval' : 'Message the Leasing Team',
        primaryAction: !verified ? 'verify' : 'chat',
        steps: [
          { n: '✓', text: 'Request sent', state: 'Done', tone: 'ok' },
          !verified
            ? { n: '2', text: 'Verify your ID', state: 'Speeds up approval', tone: 'now' }
            : { n: '2', text: isVerified(state) ? 'ID verified' : 'ID check', state: isVerified(state) ? 'Done' : 'Not needed here', tone: 'ok' },
          { n: '3', text: 'Leasing team approves', state: 'In review', tone: !verified ? 'next' : 'now' },
          { n: '4', text: 'You get a confirmation text', state: 'Next', tone: 'next' }
        ],
        warn: null,
        options: [opt('Call leasing', 'Ask about your request', 'call'), opt('Change time', 'Pick a different slot', 'reschedule'), opt('Cancel request', 'Withdraw this tour request', 'cancel', true)]
      };
    case 'early':
    default: {
      const title = dayText && extra ? `Your tour is on ${dayText}` : tour && !dayText.startsWith('Today') ? `Your tour is on ${dayText}` : "You're a little early";
      const wait = loc.atProperty || !!extra;
      const sub = `Check-in opens ${grace} minutes before your ${time} tour${wait ? '. You can explore virtually while you wait.' : ` at ${name}.`}`;
      const cancel = opt('Cancel tour', 'Free up your time slot', 'cancel', true);
      return wait
        ? { scenario: 'early', tone: 'warn', title, sub, primary: 'Remind Me When Check-in Opens', primaryAction: 'calendar', steps: null, warn: null, options: [opt('Reschedule to an earlier time', extra ? 'See earlier open slots' : 'See open slots today', 'reschedule'), cancel] }
        : { scenario: 'early', tone: 'warn', title, sub: `${sub} Once you're at the property, tap Start Tour to check in.`, primary: 'Got It', primaryAction: 'close', steps: null, warn: null, options: [opt('Add to calendar', "We'll remind you when check-in opens", 'calendar'), opt('Reschedule', 'Pick an earlier or later time', 'reschedule'), cancel] };
    }
  }
};

/** The upcoming tours list: the booked one, plus the demo extras of the Multiple scenario. */
export const extraTours = (state: Pick<AppState, 'demo'>): DemoExtraTour[] => (state.demo.upcomingTours === 'multiple' ? DEMO_EXTRA_TOURS : []);
