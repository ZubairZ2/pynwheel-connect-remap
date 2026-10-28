import type { AccessMethod, LockBluetoothKey, LockPin, RouteResult, TourHistoryEntry, TourRoute } from '~/models';
import type { AvailabilityDay, BookingSettings } from '~/repositories/tourRepository';
import { NO_CAPABILITIES, type Capabilities } from '~/services/session';
import type { Overlay, Screen } from '~/navigation/screens';
import { initialSimulationState, type SimulationState } from '~/wayfinding/simulation';

/**
 * The whole UI state of the app, as the reference keeps it in one React
 * component's `state`. It is a plain object: the reducer is pure, the
 * provider persists a subset of it (see `PERSISTED_KEYS`) and restores it
 * on launch, so backgrounding or relaunching the app returns the visitor
 * to the same floor, From, To, route and simulation.
 *
 * October 17, 2026 (the Self Tour App design refresh): the state grew the
 * design's new flows — the guest mode, the local self-tour schedule, the
 * simulated identity check and check-in, the tour's starting point, the
 * stop reactions / photos / favourites, the survey — and the **demo
 * scenarios** that stand in for the design's Tweaks panel. Everything in
 * those areas is UI-only state: no backend call is made for it and nothing
 * claims to have been saved on a server (section 12 of the brief).
 */

export const STATE_VERSION = 2;

export type TourMode = 'self' | 'ar';

export interface AiMessage {
  role: 'ai' | 'user';
  text: string;
}

export interface MapView {
  level: string;
  floor: number | null;
}

export interface WayfindingState {
  from: string | null;
  fromFloor: number | null;
  to: string | null;
  toFloor: number | null;
  stepFree: boolean;
  avoidBlockers: boolean;
  status: 'idle' | 'calculating';
  result: RouteResult | null;
  /** Which stage (level + floor) of the route the map shows. */
  view: MapView | null;
  sim: SimulationState;
  /** Which endpoint the place picker edits while it is open. */
  picker: 'from' | 'to';
}

export interface GuidedState {
  status: 'idle' | 'calculating' | 'ready' | 'error';
  tour: TourRoute | null;
  error: string | null;
  view: MapView | null;
  sim: SimulationState;
  /** Avoid stairs: the tour is recalculated step-free (a real route option). */
  stepFree: boolean;
  /** The step-free recalculation is in flight. */
  rerouting: boolean;
}

export interface AuthState {
  status: 'idle' | 'busy' | 'error';
  error: string | null;
}

/** What a smart-lock request is doing for a stop: fetching a code or key (`loading`), the Bluetooth phases, or why it failed. */
export type LockRequestStatus = 'loading' | 'scanning' | 'connecting' | 'unlocking' | 'error';

/** The lock request in flight (or the one that failed) for a stop; cleared once a code arrives or the lock opened. */
export interface LockRequestState {
  node: string;
  /** The property the request was made for: an answer for another property is dropped. */
  propertyId: number | null;
  status: LockRequestStatus;
  error: string | null;
  /** The failure's code when known (`bluetooth_off`, `permission_denied`, …), so the screen can offer the matching action. */
  errorCode?: string | null;
}

// ───────── The design refresh's UI-only state ─────────

/**
 * Where the sign-in flow is: the landing with the staff credentials (`email`),
 * the visitor's phone number (`phone`), the one-time code (`code`), the new
 * visitor's name and email (`profile`), or the "Does everything look good?"
 * confirmation after a successful sign-in (`confirm`).
 */
export type AuthStep = 'email' | 'phone' | 'code' | 'profile' | 'confirm';

/** The visitor sign-in's drafts: the phone, the code typed, when another code may be asked for, and the profile asked of a new visitor. */
export interface PhoneAuthDraft {
  phone: string;
  code: string;
  /** When "Resend code" becomes available (ms since the epoch), null before a code was sent. */
  resendAt: number | null;
  /** Testing only: the code the server disclosed (PYN_TOUR_OTP_DEBUG); shown on the code step. */
  debugCode: string | null;
  first: string;
  last: string;
  email: string;
}

export const initialPhoneAuth = (): PhoneAuthDraft => ({ phone: '', code: '', resendAt: null, debugCode: null, first: '', last: '', email: '' });

/**
 * The visit the CMS records for the tour in progress (October 23, 2026).
 * `id` is null until `POST /visits` answered (offline at check-in: the
 * persisted `clientVisitId` makes the retry idempotent); `local` means the
 * CMS refused it for good and the tour carries on as a phone-only tour;
 * `end` is set once the visitor finished and waits until `POST /end` got
 * through. Only ever created for a real property on the real provider, never
 * for demo data or a forced demo scenario.
 */
export interface VisitState {
  clientVisitId: string;
  propertyId: number;
  id: number | null;
  status: 'active' | 'local' | 'ended';
  tourType: 'self_tour' | 'guided_tour' | 'virtual_tour';
  /** ISO 8601 */
  startedAt: string;
  bookingId: number | null;
  /** Staff sessions: the visitor the admin tours with. */
  tourUserId: number | null;
  end: { endedAt: string; reason: 'completed' | 'abandoned'; abandonedAtStop: string | null } | null;
}

/** How a guest found the property they are looking at (the design's `guestProperty`). */
export type GuestPropertySource = 'near' | 'qr' | 'link';

/** The visitor's profile as the design shows it; `edits` are local overrides of the signed-in user's name / email / phone (never sent anywhere). */
export interface ProfileEdits {
  first?: string;
  last?: string;
  email?: string;
  phone?: string;
}

/** A self-tour booked in the app. Since October 20, 2026 the real provider books it in the CMS (`id` is the CMS booking id). */
export type TourStatus = 'scheduled' | 'pending' | 'checkedIn' | 'past' | 'missed' | 'cancelled';

export interface ScheduledTour {
  id: string;
  status: TourStatus;
  /** Calendar day, `YYYY-MM-DD` in the device's local time. */
  date: string;
  /** "6:00 PM" */
  time: string;
  /** Tour length in minutes. */
  length: number;
  unit: string;
  party: number;
  source: 'app' | 'website' | 'sms' | 'kiosk';
  createdAt: number;
  /** `self_tour` / `guided_tour`, as the CMS stores it. */
  tourType?: string;
  /** `HH:MM`, when the CMS answered one. */
  endTime?: string | null;
  /** The CMS booking id (`schedual_tours.id`) when the CMS made the booking; null for a local / demo one. */
  bookingId?: number | null;
  /** The CMS visitor the booking belongs to (`tour_users.id`), when the CMS answered one. */
  visitorId?: number | null;
  /** The booked instant (ms since the epoch) and the property's zone, as the CMS answered them (October 25, 2026); null for a local / demo tour. */
  bookedAtMs?: number | null;
  timeZone?: string | null;
}

export interface ScheduleDraft {
  date: string;
  /** The slot's label ("6:00 PM"); the booking sends the slot's `HH:MM`. */
  time: string;
  length: number;
  unit: string;
  party: number;
  /** The visitor's details for the booking, prefilled from the profile. */
  first: string;
  last: string;
  phone: string;
  /** The CMS Booking Form's optional fields, asked only when the property's form shows them. */
  bedroom: string;
  /** `YYYY-MM-DD` */
  moveIn: string;
}

/**
 * The property's booking rules and the next days' slots, read from the
 * repository when the Schedule screen opens (never persisted: a relaunch
 * reads them again). `days` is keyed by `YYYY-MM-DD`.
 */
export interface BookingState {
  propertyId: number | null;
  fetchedAt: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  settings: BookingSettings | null;
  days: Record<string, AvailabilityDay>;
  saving: boolean;
  saveError: string | null;
}

/** The identity check (simulated: CheckpointID is not integrated in this phase). */
export type VerifyStep = 'intro' | 'scan' | 'selfie' | 'card' | 'done';

export interface VerifyFlow {
  step: VerifyStep;
  consent: boolean;
  scanning: boolean;
  card: { number: string; expiry: string; zip: string };
  /** `start` = check in and start the tour once verified (from the check-in sheet). */
  then: 'start' | null;
}

/** An access window the visitor had (the design's "Tour passes"). */
export interface TourPass {
  id: string;
  property: string;
  date: string;
  window: string;
  doors: string;
}

export type Reaction = 'love' | 'like' | 'no';

export type LocationPermission = 'ask' | 'on' | 'off';

export interface LocationState {
  perm: LocationPermission;
  locating: boolean;
  /** Which location sheet is open: the first ask, the ask that then picks the property, or "manage". */
  sheet: 'ask' | 'pick' | 'manage' | null;
}

/** The design's Tweaks, as runtime demo scenarios the owner can switch in Settings › Demo scenarios. `auto` = whatever the app's own state says. */
export type DemoTourScenario = 'auto' | 'today' | 'upcoming' | 'pending' | 'past' | 'missed' | 'cancelled' | 'none';
export type DemoLocationScenario = 'auto' | 'denied' | 'nearby' | 'atProperty' | 'approximate' | 'offline' | 'preciseOff';
export type BuildLayout = 'listMap' | 'mapCards' | 'tabs' | 'switch';

export interface DemoScenarios {
  tour: DemoTourScenario;
  location: DemoLocationScenario;
  /** Treat the visitor's ID as verified (the design's `idVerified`). */
  idVerified: boolean;
  /** A leasing agent is online for chat (the design's `agentOnline`). */
  agentOnline: boolean;
  upcomingTours: 'one' | 'multiple';
  startingPoints: 'one' | 'multiple';
  buildLayout: BuildLayout;
}

export const initialDemoScenarios = (): DemoScenarios => ({ tour: 'auto', location: 'auto', idVerified: false, agentOnline: false, upcomingTours: 'one', startingPoints: 'one', buildLayout: 'listMap' });

export interface AppState {
  screen: Screen;
  overlays: Overlay[];
  /** Whether the visitor has signed in (the session itself lives in the repository's session store). */
  signedIn: boolean;
  /** Who is signed in, for the Profile screen: a CMS Super Admin (`staff`) or a prospect who signed in with their phone (`visitor`). */
  user: { name: string; email: string; phone?: string; kind?: 'staff' | 'visitor'; firstName?: string; lastName?: string } | null;
  /** What the server can do (visit recording, the visitor sign-in): `GET /health` on launch, refreshed by every sign-in answer. */
  capabilities: Capabilities;
  phoneAuth: PhoneAuthDraft;
  visit: VisitState | null;
  /** The selected property (null right after sign-in until one is chosen). */
  propertyId: number | null;
  auth: AuthState;
  authStep: AuthStep;
  /** Browsing without an account (the design's guest mode): demo listings only, every real action asks to sign in. */
  guest: boolean;
  guestProperty: GuestPropertySource | null;
  /** Where to go once the guest has signed in (`guestGate`). */
  pendingAfterAuth: 'schedule' | 'book' | 'upcoming' | 'history' | 'tour' | null;
  /** Why the guest gate is open ("start a self-tour", "book a live tour", …). */
  guestGateWhy: string | null;
  profileEdits: ProfileEdits;
  editingProfile: boolean;
  onboardIndex: number;
  email: string;
  password: string;
  /** Chosen stops (graph node → chosen). */
  selected: Record<string, boolean>;
  /** The stops of the running tour in visiting order (graph nodes). */
  tourOrder: string[];
  tourMode: TourMode;
  stopIndex: number;
  unlocked: Record<string, boolean>;
  unlockDrag: number;
  /** Door codes issued for this tour, by stop node (kept until the next tour, property change or sign-out). */
  lockPins: Record<string, LockPin>;
  /** Bluetooth guest keys issued for this tour, by stop node: memory only (never persisted), dropped with the tour. */
  lockKeys: Record<string, LockBluetoothKey>;
  lockRequest: LockRequestState | null;
  notes: Record<string, string>;
  noteDraft: string;
  /** The visitor's own reference photos per stop (data URLs, this tour only, never persisted or uploaded). */
  shots: Record<string, string[]>;
  /** Demo data only: the Unlock screen's `Demo · Method` choice per stop (never applied to a real lock). */
  demoMethod: Record<string, AccessMethod>;
  /** Door codes the visitor confirmed typing on a keypad (the design's "I've entered the code"), per stop and tour. */
  codeEntered: Record<string, boolean>;
  tourHistory: TourHistoryEntry[];
  historyLoaded: boolean;
  arInitStep: number;
  ai: { context: 'stop' | 'general'; messages: AiMessage[]; input: string; typing: boolean; mode: 'ai' | 'agent'; listening: boolean };
  /** Book a Live Tour: `day` is a `YYYY-MM-DD` key of the loaded calendar, `time` a slot label of that day. */
  book: { day: string; time: string; unit: string; done: boolean; submitting: boolean };
  applyUnit: string | null;
  applySubmitting: boolean;
  applyStep: 'details' | 'hold';
  notifs: { tours: boolean; startingSoon: boolean; accessExpiring: boolean; agentReplied: boolean; priceDrops: boolean; newUnits: boolean };
  helpExpanded: Record<string, boolean>;
  searchQuery: string;
  searchBeds: 'any' | '0' | '1' | '2' | '3';
  searchPrice: 'any' | 'lt2000' | 'mid' | 'gt2500';
  /** The listing the Explore screen shows (a property id of the real list, or a demo listing name). */
  exploreId: string | null;
  toast: string | null;
  journey: { toured: boolean; booked: boolean; applied: boolean; followup: boolean };
  agent: { name: string; initials: string } | null;
  wayfinding: WayfindingState;
  guided: GuidedState;
  /** The last visitor-chosen floor per level (so coming back to a level shows the same floor). */
  floorByLevel: Record<string, number | null>;

  // ── the design refresh (UI-only) ──
  demo: DemoScenarios;
  location: LocationState;
  schedule: ScheduleDraft;
  scheduleDone: boolean;
  booking: BookingState;
  scheduledTour: ScheduledTour | null;
  verified: boolean;
  /**
   * Whether the server asks for ID verification before this property's
   * check-in (October 28, 2026): read from the property detail and from every
   * visit answer; null until the server has said (demo data never does, and
   * then the check-in sheet asks as the design shows).
   */
  verificationRequired: boolean | null;
  requireCard: boolean;
  verify: VerifyFlow;
  checkedIn: boolean;
  accessEndsAt: number | null;
  passStart: number | null;
  tourPasses: TourPass[];
  virtualTour: boolean;
  startPointId: string | null;
  /** Which tour the check-in sheet is about: `main` (the booked one) or a demo extra tour's id. */
  checkinFor: string | null;
  qrMode: 'property' | 'checkin';
  reactions: Record<string, Reaction>;
  photos: Record<string, number>;
  favourites: Record<string, boolean>;
  visitedAt: Record<string, number>;
  compare: Record<string, boolean>;
  holds: Record<string, boolean>;
  skipped: Record<string, string>;
  /** The lease term (months) the unit screens price by; a published term of the unit when it has any. */
  leaseTerm: number;
  skipReason: string | null;
  audioOn: boolean;
  narration: { node: string | null; base: number; startAt: number | null };
  survey: { stars: number; unit: string | null; nps: number | null };
  /** The Build Your Tour screen's own view state that must survive leaving the screen. */
  build: { mode: 'preset' | 'custom'; tab: 'list' | 'map'; expanded: boolean; focusNode: string | null; previewNode: string | null };
  /** The Properties screen's "Find a property" steps for a guest. */
  linkStep: 'enter' | 'checking' | 'found';
}

export const initialWayfinding = (): WayfindingState => ({
  from: null,
  fromFloor: null,
  to: null,
  toFloor: null,
  stepFree: false,
  avoidBlockers: true,
  status: 'idle',
  result: null,
  view: null,
  sim: initialSimulationState('point'),
  picker: 'from'
});

export const initialGuided = (): GuidedState => ({ status: 'idle', tour: null, error: null, view: null, sim: initialSimulationState('point'), stepFree: false, rerouting: false });

export const initialVerify = (): VerifyFlow => ({ step: 'intro', consent: false, scanning: false, card: { number: '', expiry: '', zip: '' }, then: null });

/** `YYYY-MM-DD` of a day `offset` days from today, local time. */
export const dayKey = (offset = 0, from: Date = new Date()): string => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const initialSchedule = (): ScheduleDraft => ({ date: dayKey(0), time: '', length: 45, unit: '', party: 1, first: '', last: '', phone: '', bedroom: '', moveIn: '' });

export const initialBooking = (): BookingState => ({ propertyId: null, fetchedAt: 0, status: 'idle', error: null, settings: null, days: {}, saving: false, saveError: null });

export const initialAppState = (): AppState => ({
  screen: 'splash',
  overlays: [],
  signedIn: false,
  user: null,
  propertyId: null,
  capabilities: NO_CAPABILITIES,
  phoneAuth: initialPhoneAuth(),
  visit: null,
  auth: { status: 'idle', error: null },
  authStep: 'email',
  guest: false,
  guestProperty: null,
  pendingAfterAuth: null,
  guestGateWhy: null,
  profileEdits: {},
  editingProfile: false,
  onboardIndex: 0,
  email: '',
  password: '',
  selected: {},
  tourOrder: [],
  tourMode: 'self',
  stopIndex: 0,
  unlocked: {},
  unlockDrag: 0,
  lockPins: {},
  lockKeys: {},
  lockRequest: null,
  notes: {},
  noteDraft: '',
  shots: {},
  demoMethod: {},
  codeEntered: {},
  tourHistory: [],
  historyLoaded: false,
  arInitStep: 0,
  ai: { context: 'general', messages: [], input: '', typing: false, mode: 'ai', listening: false },
  book: { day: '', time: '', unit: '', done: false, submitting: false },
  applyUnit: null,
  applySubmitting: false,
  applyStep: 'details',
  notifs: { tours: true, startingSoon: true, accessExpiring: true, agentReplied: true, priceDrops: true, newUnits: false },
  helpExpanded: {},
  searchQuery: '',
  searchBeds: 'any',
  searchPrice: 'any',
  exploreId: null,
  toast: null,
  journey: { toured: false, booked: false, applied: false, followup: false },
  agent: null,
  wayfinding: initialWayfinding(),
  guided: initialGuided(),
  floorByLevel: {},
  demo: initialDemoScenarios(),
  location: { perm: 'ask', locating: false, sheet: null },
  schedule: initialSchedule(),
  booking: initialBooking(),
  scheduleDone: false,
  scheduledTour: null,
  verified: false,
  verificationRequired: null,
  requireCard: true,
  verify: initialVerify(),
  checkedIn: false,
  accessEndsAt: null,
  passStart: null,
  tourPasses: [],
  virtualTour: false,
  startPointId: null,
  checkinFor: null,
  qrMode: 'property',
  reactions: {},
  photos: {},
  favourites: {},
  visitedAt: {},
  compare: {},
  holds: {},
  skipped: {},
  leaseTerm: 12,
  skipReason: null,
  audioOn: true,
  narration: { node: null, base: 0, startAt: null },
  survey: { stars: 0, unit: null, nps: null },
  build: { mode: 'preset', tab: 'list', expanded: false, focusNode: null, previewNode: null },
  linkStep: 'enter'
});

/** What survives a relaunch. Overlays, drafts, the toast and in-flight requests do not. */
export const PERSISTED_KEYS = [
  'screen',
  'signedIn',
  'user',
  'capabilities',
  'visit',
  'propertyId',
  'guest',
  'guestProperty',
  'profileEdits',
  'selected',
  'tourOrder',
  'tourMode',
  'stopIndex',
  'unlocked',
  'lockPins',
  'notes',
  'tourHistory',
  'historyLoaded',
  'notifs',
  'journey',
  'wayfinding',
  'guided',
  'floorByLevel',
  'demo',
  'scheduledTour',
  'verified',
  'verificationRequired',
  'requireCard',
  'checkedIn',
  'accessEndsAt',
  'passStart',
  'tourPasses',
  'virtualTour',
  'startPointId',
  'reactions',
  'photos',
  'favourites',
  'visitedAt',
  'compare',
  'holds',
  'skipped',
  'audioOn'
] as const satisfies readonly (keyof AppState)[];

export type PersistedState = Pick<AppState, (typeof PERSISTED_KEYS)[number]>;
