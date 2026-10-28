import type { AccessMethod, LockBluetoothKey, LockPin, RouteResult, TourHistoryEntry, TourRoute } from '~/models';
import type { AvailabilityDay, BookingSettings, IdDocumentType, VerificationOutcome, VerificationStatus } from '~/repositories/tourRepository';
import { profileOf, propertyZone, scheduleDay, slotsForDay } from './views';
import { DEMO_SCENARIOS_ENABLED } from '~/config/env';
import { backScreenOf, topOverlay, type Overlay, type Screen } from '~/navigation/screens';
import { initialSimulationState, type SimulationState } from '~/wayfinding/simulation';
import type { Capabilities } from '~/services/session';
import {
  DOCUMENT_NEEDS_BACK,
  initialAppState,
  initialDemoScenarios,
  initialGuided,
  initialPhoneAuth,
  initialSchedule,
  initialVerify,
  initialWayfinding,
  type AiMessage,
  type AppState,
  type DemoScenarios,
  type GuestPropertySource,
  type LockRequestStatus,
  type MapView,
  type PersistedState,
  type Reaction,
  type ScheduleDraft,
  type ScheduledTour,
  type TourMode,
  type TourPass,
  type VerifyCapture, type VerifyStep, type VerificationInfo, type BookingState, type VisitState } from './appState';

/**
 * Every state change of the app, in one pure reducer. The async flows
 * (loading data, calculating routes, the concierge's delayed reply) live in
 * `useAppActions` and dispatch the plain actions below when they finish.
 */

export type Action =
  | { type: 'hydrate'; state: PersistedState }
  | { type: 'navigate'; screen: Screen }
  | { type: 'back' }
  | { type: 'openOverlay'; overlay: Overlay }
  | { type: 'closeOverlay'; overlay: Overlay }
  | { type: 'closeTopOverlay' }
  | { type: 'splashDone' }
  | { type: 'onboardNext'; count: number }
  | { type: 'onboardPrev' }
  | { type: 'skipOnboard' }
  | { type: 'setEmail'; value: string }
  | { type: 'setPassword'; value: string }
  | { type: 'loginStart' }
  | { type: 'loginFailed'; message: string }
  | { type: 'loginSucceeded'; user: NonNullable<AppState['user']>; propertyId: number | null }
  | { type: 'setUser'; user: NonNullable<AppState['user']> }
  | { type: 'setCapabilities'; capabilities: Capabilities }
  // ── the visitor sign-in (phone + one-time code) ──
  | { type: 'authStep'; step: Exclude<AppState['authStep'], 'confirm'> }
  | { type: 'setPhone'; value: string }
  | { type: 'setOtpCode'; value: string }
  | { type: 'setOtpProfile'; field: 'first' | 'last' | 'email'; value: string }
  | { type: 'otpSent'; resendAt: number; debugCode?: string | null }
  | { type: 'otpProfileRequired' }
  | { type: 'confirmProfile' }
  | { type: 'editProfile'; on: boolean }
  | { type: 'setProfileField'; field: 'first' | 'last' | 'email' | 'phone'; value: string }
  | { type: 'authBack' }
  | { type: 'continueAsGuest' }
  | { type: 'guestGate'; why: string; pending: AppState['pendingAfterAuth'] }
  | { type: 'pendingAfterAuth'; pending: AppState['pendingAfterAuth'] }
  | { type: 'guestSignIn' }
  | { type: 'guestFound'; via: GuestPropertySource }
  | { type: 'guestChangeProperty' }
  | { type: 'selectProperty'; propertyId: number; then?: 'schedule' | null }
  | { type: 'sessionExpired'; message: string }
  | { type: 'signOut' }
  | { type: 'toggleStop'; node: string }
  | { type: 'selectStops'; nodes: string[] }
  | { type: 'startBuildTour' }
  | { type: 'tourCalculating'; mode: TourMode }
  | { type: 'tourReady'; tour: TourRoute; order: string[]; mode: TourMode }
  | { type: 'tourFailed'; message: string }
  | { type: 'startArShortcut'; nodes: string[] }
  | { type: 'enterAr' }
  | { type: 'arInitTick' }
  | { type: 'goChooseStops' }
  | { type: 'beginGuided' }
  | { type: 'jumpToStop'; node: string }
  | { type: 'arrive'; now: number }
  | { type: 'nextStop' }
  | { type: 'finishTour'; entry: TourHistoryEntry; pass: TourPass | null; bookingCompleted?: boolean }
  /** The CMS's bookings at the chosen property, read again on resume (October 25, 2026): its status wins over the phone's copy. */
  | { type: 'syncBookings'; propertyId: number; tours: ScheduledTour[] }
  /** The property's stops as just loaded: a persisted tour that names stops no longer on the list is pruned. */
  | { type: 'bundleLoaded'; nodes: string[] }
  /** What the server said about ID verification at this property (the property detail, a visit answer); an answer for another property is dropped. */
  | { type: 'verificationRequired'; propertyId: number; required: boolean | null }
  /** The booking rules the phone holds may be stale (the property's configuration moved): read them again next time. */
  | { type: 'bookingStale' }
  | { type: 'exitStop' }
  | { type: 'unlockDrag'; pct: number }
  | { type: 'unlockRelease'; node: string }
  | { type: 'demoUnlock'; node: string }
  | { type: 'lockPinStart'; node: string }
  | { type: 'lockPinReady'; node: string; propertyId: number | null; pin: LockPin }
  | { type: 'lockPinFailed'; node: string; propertyId: number | null; message: string; code?: string | null }
  | { type: 'lockPinDismiss' }
  | { type: 'lockKeyReady'; node: string; propertyId: number | null; key: LockBluetoothKey }
  | { type: 'lockPhase'; node: string; propertyId: number | null; status: Exclude<LockRequestStatus, 'error'> }
  | { type: 'lockUnlocked'; node: string; propertyId: number | null }
  | { type: 'openNote'; node: string }
  | { type: 'setNoteDraft'; value: string }
  | { type: 'saveNote'; node: string }
  | { type: 'toast'; message: string | null }
  | { type: 'openAiChat'; context: 'stop' | 'general'; greeting: string; mode?: 'ai' | 'agent' }
  | { type: 'setAiInput'; value: string }
  | { type: 'aiAsk'; question: string }
  | { type: 'aiReply'; text: string }
  | { type: 'aiHuman'; text: string }
  | { type: 'aiMode'; mode: 'ai' | 'agent'; text?: string }
  | { type: 'aiListening'; on: boolean; input?: string }
  | { type: 'openBook'; day: string; time: string; unit: string }
  | { type: 'setBook'; field: 'day' | 'time' | 'unit'; value: string }
  | { type: 'bookSubmitting' }
  | { type: 'bookDone' }
  | { type: 'openApply'; unit: string }
  | { type: 'pickApplyUnit'; unit: string }
  | { type: 'applyStep'; step: 'details' | 'hold' }
  | { type: 'applySubmitting' }
  | { type: 'applyDone'; message: string }
  | { type: 'applyFailed'; message: string }
  | { type: 'toggleNotif'; key: keyof AppState['notifs'] }
  | { type: 'toggleHelp'; id: string }
  | { type: 'setSearchQuery'; value: string }
  | { type: 'setSearchBeds'; value: AppState['searchBeds'] }
  | { type: 'setSearchPrice'; value: AppState['searchPrice'] }
  | { type: 'openExplore'; id: string }
  | { type: 'setHistory'; history: TourHistoryEntry[] }
  | { type: 'wfOpenPicker'; which: 'from' | 'to' }
  | { type: 'wfSetEndpoint'; which: 'from' | 'to'; node: string | null; floor: number | null }
  | { type: 'wfSwap' }
  | { type: 'wfToggleStepFree' }
  | { type: 'wfToggleAvoidBlockers' }
  | { type: 'wfClear' }
  | { type: 'wfCalculating' }
  | { type: 'wfResult'; result: RouteResult }
  | { type: 'wfView'; view: MapView }
  | { type: 'wfSim'; sim: SimulationState }
  | { type: 'guidedView'; view: MapView }
  | { type: 'guidedSim'; sim: SimulationState }
  | { type: 'guidedStepFree'; on: boolean }
  | { type: 'guidedRerouting'; on: boolean }
  | { type: 'setFloor'; level: string; floor: number | null }
  | { type: 'addStop'; node: string }
  | { type: 'tourUpdated'; tour: TourRoute; order: string[] }
  | { type: 'leaveTour' }
  | { type: 'resetTour' }
  // ── the design refresh ──
  | { type: 'setDemo'; patch: Partial<DemoScenarios> }
  | { type: 'resetDemo' }
  | { type: 'locAsk'; sheet: 'ask' | 'pick' | 'manage' }
  | { type: 'locClose' }
  | { type: 'locLocating' }
  | { type: 'locLocated' }
  | { type: 'locDeny' }
  | { type: 'qrOpen'; mode: 'property' | 'checkin' }
  | { type: 'linkStep'; step: AppState['linkStep'] }
  | { type: 'openSchedule'; draft: ScheduleDraft }
  | { type: 'setSchedule'; patch: Partial<ScheduleDraft> }
  | { type: 'confirmSchedule'; tour: ScheduledTour }
  /** A booking the CMS already holds for the signed-in visitor: shown on Home unless a live one is already there. */
  | { type: 'adoptBooking'; tour: ScheduledTour }
  | { type: 'cancelTour' }
  | { type: 'bookingLoading'; propertyId: number }
  | { type: 'bookingLoaded'; propertyId: number; settings: BookingSettings; days: AvailabilityDay[]; now: number }
  | { type: 'bookingFailed'; message: string }
  | { type: 'bookingSaving' }
  | { type: 'bookingSaveFailed'; message: string }
  // ── the ID check (October 28, 2026): every fact about the verification comes from the server ──
  | { type: 'openVerify'; then: 'start' | null }
  /** `GET /verification` answered (an answer for another property is dropped). */
  | { type: 'verifyStatus'; propertyId: number; status: VerificationStatus; now: number }
  | { type: 'verifyStatusFailed'; message: string; unavailable: boolean }
  | { type: 'verifyConsent' }
  | { type: 'verifyStep'; step: VerifyStep }
  | { type: 'verifyDocumentType'; documentType: IdDocumentType }
  /** A picture taken; the next capture step follows (the selfie is the last: the actions submit right after). */
  | { type: 'verifyCaptured'; kind: VerifyCapture; image: string }
  | { type: 'verifyRetake'; kind: VerifyCapture }
  | { type: 'verifySubmitting' }
  /** The server's reading of the provider's answer; the pictures are dropped either way. */
  | { type: 'verifyResult'; propertyId: number; outcome: VerificationOutcome; reason: string | null; status: VerificationStatus; now: number }
  /** The attempt could not run (provider or server unreachable, the attempt limit …); a retryable one keeps the pictures. */
  | { type: 'verifyFailed'; code: string; message: string; retryable: boolean }
  | { type: 'verifyCardSaving' }
  | { type: 'verifyCardSaved'; propertyId: number; status: VerificationStatus; now: number }
  | { type: 'verifyCardFailed'; message: string }
  | { type: 'verifyFinish' }
  | { type: 'openCheckin'; for: string | null }
  | { type: 'checkIn'; now: number; accessMs: number; visit?: VisitState | null }
  | { type: 'visitStarted'; clientVisitId: string; id: number; accessEndsAt: number | null }
  | { type: 'visitLocal'; clientVisitId: string }
  | { type: 'visitEnding'; clientVisitId: string; end: NonNullable<VisitState['end']> }
  | { type: 'visitClosed'; clientVisitId: string }
  | { type: 'extendAccess'; ms: number }
  | { type: 'goTourStart'; startPointId: string | null; virtual: boolean }
  | { type: 'setStartPoint'; id: string }
  | { type: 'continueToBuild'; selectAll: string[] | null }
  | { type: 'openSkip' }
  | { type: 'setSkipReason'; reason: string }
  | { type: 'skipStop'; node: string; reason: string }
  | { type: 'setReaction'; node: string; reaction: Reaction }
  | { type: 'toggleFavourite'; node: string }
  | { type: 'addPhoto'; node: string; dataUrl?: string }
  | { type: 'setDemoMethod'; node: string; method: AccessMethod }
  | { type: 'codeEntered'; node: string }
  | { type: 'locateStop'; node: string; view: MapView | null }
  | { type: 'toggleCompare'; node: string }
  | { type: 'holdUnit'; node: string }
  | { type: 'setLeaseTerm'; term: number }
  | { type: 'toggleAudio' }
  | { type: 'narration'; node: string | null; base: number; startAt: number | null }
  | { type: 'setSurvey'; patch: Partial<AppState['survey']> }
  | { type: 'buildView'; patch: Partial<AppState['build']> };

const without = (overlays: Overlay[], overlay: Overlay) => overlays.filter((o) => o !== overlay);
const withOnTop = (overlays: Overlay[], overlay: Overlay) => [...without(overlays, overlay), overlay];

const firstView = (tour: TourRoute | null): MapView | null => {
  const stage = tour?.segments[0]?.route.stages[0] ?? tour?.route.stages[0];
  return stage ? { level: stage.level, floor: stage.floor } : null;
};

const segmentView = (tour: TourRoute | null, index: number): MapView | null => {
  const stage = tour?.segments[index]?.route.stages[0];
  return stage ? { level: stage.level, floor: stage.floor } : firstView(tour);
};

/** Everything that belongs to one property's tour: cleared when the property changes. */
const propertyScoped = (): Partial<AppState> => ({
  selected: {},
  tourOrder: [],
  stopIndex: 0,
  unlocked: {},
  unlockDrag: 0,
  lockPins: {},
  lockKeys: {},
  lockRequest: null,
  notes: {},
  shots: {},
  demoMethod: {},
  codeEntered: {},
  guided: initialGuided(),
  wayfinding: initialWayfinding(),
  floorByLevel: {},
  scheduledTour: null,
  scheduleDone: false,
  verificationRequired: null,
  verification: null,
  checkedIn: false,
  accessEndsAt: null,
  passStart: null,
  virtualTour: false,
  startPointId: null,
  reactions: {},
  photos: {},
  favourites: {},
  visitedAt: {},
  compare: {},
  holds: {},
  skipped: {},
  build: { mode: 'preset', tab: 'list', expanded: false, focusNode: null, previewNode: null }
});

/** What a finished or abandoned tour leaves behind: the next tour starts clean. */
const tourScoped = (): Partial<AppState> => ({
  selected: {},
  tourOrder: [],
  stopIndex: 0,
  unlocked: {},
  unlockDrag: 0,
  lockPins: {},
  lockKeys: {},
  lockRequest: null,
  shots: {},
  codeEntered: {},
  guided: initialGuided(),
  checkedIn: false,
  accessEndsAt: null,
  passStart: null,
  virtualTour: false,
  skipped: {},
  survey: { stars: 0, unit: null, nps: null }
});

const toStop = (state: AppState, index: number): AppState => ({
  ...state,
  stopIndex: index,
  screen: 'guided',
  overlays: [],
  unlockDrag: 0,
  guided: { ...state.guided, view: segmentView(state.guided.tour, index), sim: initialSimulationState(state.guided.sim.mode) }
});


/**
 * The Schedule draft with the signed-in visitor's details in any empty field
 * and a date no earlier than today, for the paths that open the screen from
 * the reducer (a property switch, the sign-in gate) rather than through
 * `useAppActions.openSchedule` (October 25, 2026).
 */
const prefilledSchedule = (state: AppState, propertyId: number | null): ScheduleDraft => {
  const p = profileOf(state, null);
  const s = state.schedule;
  // The day is the property's, not the phone's (October 28, 2026); unknown until the property's rules are loaded.
  return { ...s, date: scheduleDay(s.date, propertyZone({ propertyId, booking: state.booking })), first: s.first || p.first, last: s.last || p.last, phone: s.phone || p.phone, unit: s.unit || 'No preference' };
};

/**
 * Where the ID check stands once the server has spoken (October 28, 2026): a
 * visitor the server calls verified skips the capture (to the card where one
 * is still needed, else to Done), whatever the phone was showing; a visitor
 * it does not call verified never sits on Done.
 */
const stepAfterStatus = (step: VerifyStep, info: VerificationInfo): VerifyStep => {
  if (info.state === 'verified') {
    if (step === 'intro' || step === 'submitting' || step === 'result' || step === 'card' || step === 'done') return info.card.needed ? 'card' : 'done';
    return step;
  }
  return step === 'done' || step === 'card' ? 'intro' : step;
};

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'hydrate': {
      const next: AppState = { ...state, ...action.state, auth: { status: 'idle', error: null } };
      // A simulation that was playing resumes paused; overlays never persist.
      next.wayfinding = { ...initialWayfinding(), ...next.wayfinding, status: 'idle', sim: { ...next.wayfinding.sim, status: next.wayfinding.sim.status === 'playing' ? 'paused' : next.wayfinding.sim.status } };
      next.guided = { ...initialGuided(), ...next.guided, status: next.guided.tour ? 'ready' : 'idle', rerouting: false, sim: { ...next.guided.sim, status: next.guided.sim.status === 'playing' ? 'paused' : next.guided.sim.status } };
      next.overlays = [];
      next.toast = null;
      next.lockRequest = null;
      next.lockPins = next.lockPins ?? {};
      next.lockKeys = {};
      next.shots = {};
      next.demoMethod = {};
      next.codeEntered = {};
      // A build without the Demo scenarios panel cannot reset a forced scenario, so it never restores one.
      next.demo = DEMO_SCENARIOS_ENABLED ? { ...initialDemoScenarios(), ...(next.demo ?? {}) } : initialDemoScenarios();
      next.notifs = { ...initialAppState().notifs, ...(next.notifs ?? {}) };
      next.authStep = 'email';
      next.phoneAuth = initialPhoneAuth();
      next.capabilities = { ...initialAppState().capabilities, ...(next.capabilities ?? {}) };
      next.visit = next.visit ?? null;
      next.location = { ...state.location, sheet: null, locating: false };
      next.verify = initialVerify();
      next.verification = next.verification ?? null;
      // An access window that ended while the app was closed is over, and its door codes with it.
      if (next.accessEndsAt != null && next.accessEndsAt <= Date.now()) {
        next.checkedIn = false;
        next.lockPins = {};
      }
      return next;
    }
    case 'navigate':
      // Going somewhere explicitly abandons whatever a sign-in or property pick was meant to open next.
      return { ...state, screen: action.screen, overlays: [], pendingAfterAuth: null };
    case 'back': {
      const top = topOverlay(state.overlays);
      if (top) return { ...state, overlays: without(state.overlays, top) };
      const target = backScreenOf(state.screen, state.tourMode, { checkedIn: state.checkedIn, virtualTour: state.virtualTour });
      return target ? { ...state, screen: target } : state;
    }
    case 'openOverlay':
      return state.overlays.includes(action.overlay) ? state : { ...state, overlays: [...state.overlays, action.overlay] };
    case 'closeOverlay':
      return { ...state, overlays: without(state.overlays, action.overlay) };
    case 'closeTopOverlay': {
      const top = topOverlay(state.overlays);
      return top ? { ...state, overlays: without(state.overlays, top) } : state;
    }
    case 'splashDone':
      if (state.screen !== 'splash') return state;
      return { ...state, screen: state.signedIn || state.guest ? 'home' : 'onboarding' };
    case 'onboardNext':
      return state.onboardIndex >= action.count - 1 ? { ...state, screen: 'getStarted', authStep: 'email' } : { ...state, onboardIndex: state.onboardIndex + 1 };
    case 'onboardPrev':
      return { ...state, onboardIndex: Math.max(0, state.onboardIndex - 1) };
    case 'skipOnboard':
      return { ...state, screen: 'getStarted', authStep: 'email' };
    case 'setEmail':
      return { ...state, email: action.value };
    case 'setPassword':
      return { ...state, password: action.value };
    case 'loginStart':
      return { ...state, auth: { status: 'busy', error: null } };
    case 'loginFailed':
      return { ...state, auth: { status: 'error', error: action.message } };
    case 'loginSucceeded':
      // The design confirms the profile ("Does everything look good?") before Home. A visitor's details are the CMS's own, so no earlier local edits are laid over them.
      return { ...state, screen: 'getStarted', authStep: 'confirm', signedIn: true, guest: false, guestProperty: null, user: action.user, propertyId: action.propertyId, password: '', profileEdits: action.user.kind === 'visitor' ? {} : state.profileEdits, phoneAuth: { ...state.phoneAuth, code: '' }, editingProfile: false, auth: { status: 'idle', error: null } };
    case 'setUser':
      return { ...state, user: action.user, profileEdits: {}, editingProfile: false };
    case 'setCapabilities':
      return state.capabilities.visits === action.capabilities.visits && state.capabilities.visitorAuth === action.capabilities.visitorAuth ? state : { ...state, capabilities: action.capabilities };
    case 'authStep':
      return { ...state, authStep: action.step, auth: { status: 'idle', error: null }, phoneAuth: action.step === 'phone' ? { ...state.phoneAuth, code: '' } : state.phoneAuth };
    case 'setPhone':
      return { ...state, phoneAuth: { ...state.phoneAuth, phone: action.value } };
    case 'setOtpCode':
      return { ...state, phoneAuth: { ...state.phoneAuth, code: action.value.replace(/\D/g, '').slice(0, 6) }, auth: state.auth.status === 'error' ? { status: 'idle', error: null } : state.auth };
    case 'setOtpProfile':
      return { ...state, phoneAuth: { ...state.phoneAuth, [action.field]: action.value } };
    case 'otpSent':
      return { ...state, authStep: 'code', phoneAuth: { ...state.phoneAuth, code: '', resendAt: action.resendAt, debugCode: action.debugCode ?? null }, auth: { status: 'idle', error: null } };
    case 'otpProfileRequired':
      return { ...state, authStep: 'profile', auth: { status: 'idle', error: null } };
    case 'confirmProfile': {
      const pending = state.pendingAfterAuth;
      const screen: Screen = state.propertyId == null ? 'search' : pending === 'schedule' ? 'schedule' : 'home';
      const overlays: Overlay[] = state.propertyId != null && pending === 'book' ? ['book'] : state.propertyId != null && pending === 'upcoming' ? ['upcoming'] : state.propertyId != null && pending === 'history' ? ['history'] : [];
      // Without a property the visitor picks one first; a pending Schedule survives so `selectProperty` can open it.
      const keep = state.propertyId == null && pending === 'schedule' ? pending : null;
      return { ...state, screen, overlays, authStep: 'email', editingProfile: false, pendingAfterAuth: keep, guestGateWhy: null, scheduleDone: false, ...(screen === 'schedule' ? { schedule: prefilledSchedule(state, state.propertyId) } : {}) };
    }
    case 'editProfile':
      return { ...state, editingProfile: action.on };
    case 'setProfileField':
      return { ...state, profileEdits: { ...state.profileEdits, [action.field]: action.value } };
    case 'authBack':
      // Back from the confirmation abandons the sign-in: the session is gone (the action logs the token out).
      if (state.authStep === 'confirm') return { ...state, authStep: 'email', editingProfile: false, signedIn: false, user: null, propertyId: null, password: '', profileEdits: {} };
      // The phone flow steps back to the phone, then to the landing.
      if (state.authStep === 'code' || state.authStep === 'profile') return { ...state, authStep: 'phone', auth: { status: 'idle', error: null }, phoneAuth: { ...state.phoneAuth, code: '' } };
      if (state.authStep === 'phone') return { ...state, authStep: 'email', auth: { status: 'idle', error: null } };
      return state.guest ? { ...state, screen: 'home', pendingAfterAuth: null, guestGateWhy: null } : { ...state, screen: 'onboarding' };
    case 'continueAsGuest':
      // Guest mode never coexists with a live session.
      return { ...state, screen: 'home', overlays: [], guest: true, guestProperty: null, pendingAfterAuth: null, guestGateWhy: null, scheduledTour: null, signedIn: false, user: null, propertyId: state.signedIn ? null : state.propertyId, authStep: 'email', password: '' };
    case 'pendingAfterAuth':
      return { ...state, pendingAfterAuth: action.pending };
    case 'guestGate':
      return { ...state, overlays: withOnTop(state.overlays, 'guestGate'), guestGateWhy: action.why, pendingAfterAuth: action.pending };
    case 'guestSignIn':
      return { ...state, screen: 'getStarted', overlays: [], authStep: 'email', auth: { status: 'idle', error: null } };
    case 'guestFound':
      return { ...state, guestProperty: action.via, overlays: [] };
    case 'guestChangeProperty':
      return { ...state, guestProperty: null };
    case 'selectProperty':
      {
      const then = action.then ?? state.pendingAfterAuth;
      // October 25, 2026: a Schedule opened straight after the switch is prefilled like `openSchedule` does.
      const schedule = then === 'schedule' ? { schedule: prefilledSchedule(state, action.propertyId), scheduleDone: false } : {};
      if (state.propertyId === action.propertyId) return { ...state, ...schedule, screen: then === 'schedule' ? 'schedule' : 'home', overlays: [], searchQuery: '', pendingAfterAuth: null };
      // A new property: every tour, route and selection belonged to the old one.
      return { ...state, ...propertyScoped(), ...schedule, propertyId: action.propertyId, screen: then === 'schedule' ? 'schedule' : 'home', overlays: [], searchQuery: '', pendingAfterAuth: null, exploreId: null };
      }
    case 'sessionExpired':
      return { ...initialAppState(), screen: 'getStarted', signedIn: false, email: state.email, capabilities: state.capabilities, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey, demo: state.demo, toast: action.message };
    case 'signOut':
      // `verified` belongs to the account that signed out: the next account on this phone must not inherit it.
      return { ...initialAppState(), screen: 'getStarted', signedIn: false, capabilities: state.capabilities, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey, demo: state.demo };
    case 'toggleStop':
      return { ...state, selected: { ...state.selected, [action.node]: !state.selected[action.node] } };
    case 'selectStops': {
      const selected: Record<string, boolean> = {};
      action.nodes.forEach((n) => {
        selected[n] = true;
      });
      return { ...state, selected };
    }
    case 'startBuildTour':
      return { ...state, screen: 'buildTour', overlays: [] };
    case 'tourCalculating':
      return { ...state, tourMode: action.mode, guided: { ...state.guided, status: 'calculating', error: null } };
    case 'tourReady': {
      const guided = { ...state.guided, status: 'ready' as const, tour: action.tour, error: null, view: firstView(action.tour), sim: initialSimulationState('stop') };
      // A new tour means new door codes, as the legacy app regenerated its lock accesses on every tour start.
      return { ...state, tourMode: action.mode, tourOrder: action.order, stopIndex: 0, unlocked: {}, lockPins: {}, lockKeys: {}, lockRequest: null, codeEntered: {}, skipped: {}, screen: action.mode === 'ar' ? 'arLive' : 'guided', overlays: [], guided };
    }
    case 'tourFailed':
      return { ...state, guided: { ...state.guided, status: 'error', error: action.message } };
    case 'startArShortcut': {
      const selected: Record<string, boolean> = {};
      action.nodes.forEach((n) => {
        selected[n] = true;
      });
      return { ...state, selected, screen: 'scanQr', overlays: [] };
    }
    case 'enterAr':
      return { ...state, screen: 'arInit', arInitStep: 0 };
    case 'arInitTick':
      return { ...state, arInitStep: Math.min(5, state.arInitStep + 1) };
    case 'goChooseStops':
      return { ...state, screen: 'chooseStops' };
    case 'beginGuided':
      return toStop(state, 0);
    case 'jumpToStop': {
      const index = state.tourOrder.indexOf(action.node);
      if (index < 0) return state;
      // Jumping from the itinerary closes it, so the map is visible at once.
      return toStop(state, index);
    }
    case 'arrive': {
      const node = state.tourOrder[state.stopIndex];
      if (!node) return state;
      return { ...state, screen: 'stop', overlays: [], unlockDrag: 0, visitedAt: { ...state.visitedAt, [node]: state.visitedAt[node] ?? action.now } };
    }
    case 'nextStop': {
      if (state.stopIndex + 1 < state.tourOrder.length) return toStop(state, state.stopIndex + 1);
      // The last stop: an in-person tour returns to its starting point first; a virtual tour (and the AR demo) finish at once.
      if (state.virtualTour || state.tourMode === 'ar') return state; // the action layer dispatches `finishTour`
      return { ...state, screen: 'tourReturn', overlays: [] };
    }
    case 'finishTour':
      return {
        ...state,
        ...tourScoped(),
        screen: 'tourComplete',
        overlays: [],
        journey: { ...state.journey, toured: true },
        tourHistory: [action.entry, ...state.tourHistory],
        tourPasses: action.pass ? [action.pass, ...state.tourPasses] : state.tourPasses,
        scheduledTour: action.bookingCompleted && state.scheduledTour ? { ...state.scheduledTour, status: 'past' } : state.scheduledTour,
        // The summary still needs the order and what happened on the tour.
        tourOrder: state.tourOrder,
        unlocked: state.unlocked,
        guided: state.guided
      };
    case 'exitStop':
      return { ...state, screen: state.tourMode === 'ar' ? 'arLive' : 'guided', overlays: [] };
    case 'unlockDrag':
      return { ...state, unlockDrag: Math.max(0, Math.min(100, action.pct)) };
    case 'unlockRelease':
      return state.unlockDrag >= 85 ? { ...state, unlockDrag: 100, unlocked: { ...state.unlocked, [action.node]: true } } : { ...state, unlockDrag: 0 };
    case 'demoUnlock':
      return { ...state, unlocked: { ...state.unlocked, [action.node]: true }, unlockDrag: 100 };
    case 'lockPinStart':
      return { ...state, lockRequest: { node: action.node, propertyId: state.propertyId, status: 'loading', error: null } };
    case 'lockPinReady':
      if (action.propertyId !== state.propertyId) return state; // issued for a property the visitor has since left
      // Only this stop's in-flight status is cleared: another stop's request may still be running.
      return { ...state, lockPins: { ...state.lockPins, [action.node]: action.pin }, unlocked: { ...state.unlocked, [action.node]: true }, lockRequest: state.lockRequest?.node === action.node ? null : state.lockRequest };
    case 'lockPinFailed':
      if (action.propertyId !== state.propertyId) return state;
      return { ...state, lockRequest: { node: action.node, propertyId: action.propertyId, status: 'error', error: action.message, errorCode: action.code ?? null } };
    case 'lockPinDismiss':
      return { ...state, lockRequest: null };
    case 'lockKeyReady':
      if (action.propertyId !== state.propertyId) return state;
      return { ...state, lockKeys: { ...state.lockKeys, [action.node]: action.key } };
    case 'lockPhase':
      if (action.propertyId !== state.propertyId) return state;
      return { ...state, lockRequest: { node: action.node, propertyId: action.propertyId, status: action.status, error: null } };
    case 'lockUnlocked':
      if (action.propertyId !== state.propertyId) return state;
      return { ...state, unlocked: { ...state.unlocked, [action.node]: true }, lockRequest: state.lockRequest?.node === action.node ? null : state.lockRequest };
    case 'openNote':
      return { ...state, overlays: withOnTop(state.overlays, 'note'), noteDraft: state.notes[action.node] ?? '' };
    case 'setNoteDraft':
      return { ...state, noteDraft: action.value };
    case 'saveNote':
      return { ...state, notes: { ...state.notes, [action.node]: state.noteDraft }, overlays: without(state.overlays, 'note') };
    case 'toast':
      return { ...state, toast: action.message };
    case 'openAiChat':
      return { ...state, overlays: withOnTop(without(state.overlays, 'chatOptions'), 'aiChat'), ai: { context: action.context, messages: [{ role: 'ai', text: action.greeting }], input: '', typing: false, mode: action.mode ?? 'ai', listening: false } };
    case 'setAiInput':
      return { ...state, ai: { ...state.ai, input: action.value } };
    case 'aiAsk': {
      const message: AiMessage = { role: 'user', text: action.question };
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, message], input: '', typing: true, listening: false } };
    }
    case 'aiReply':
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, { role: 'ai', text: action.text }], typing: false } };
    case 'aiHuman':
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, { role: 'ai', text: action.text }], typing: false } };
    case 'aiMode':
      return { ...state, overlays: state.overlays.includes('aiChat') ? state.overlays : withOnTop(without(state.overlays, 'chatOptions'), 'aiChat'), ai: { ...state.ai, mode: action.mode, messages: action.text ? [...state.ai.messages, { role: 'ai', text: action.text }] : state.ai.messages, typing: false } };
    case 'aiListening':
      return { ...state, ai: { ...state.ai, listening: action.on, input: action.input ?? state.ai.input } };
    case 'openBook':
      return { ...state, overlays: withOnTop(state.overlays, 'book'), book: { day: action.day, time: action.time, unit: action.unit, done: false, submitting: false } };
    case 'setBook':
      return { ...state, book: { ...state.book, [action.field]: action.value } };
    case 'bookSubmitting':
      return { ...state, book: { ...state.book, submitting: true } };
    case 'bookDone':
      return { ...state, book: { ...state.book, submitting: false, done: true }, journey: { ...state.journey, booked: true } };
    case 'openApply':
      return { ...state, overlays: withOnTop(state.overlays, 'apply'), applyUnit: action.unit, applySubmitting: false, applyStep: 'details' };
    case 'pickApplyUnit':
      return { ...state, applyUnit: action.unit };
    case 'applyStep':
      return { ...state, applyStep: action.step, holds: action.step === 'hold' && state.applyUnit ? { ...state.holds, [state.applyUnit]: true } : state.holds };
    case 'applySubmitting':
      return { ...state, applySubmitting: true };
    case 'applyDone':
      return { ...state, applySubmitting: false, applyStep: 'details', overlays: without(state.overlays, 'apply'), toast: action.message, journey: { ...state.journey, applied: true } };
    case 'applyFailed':
      // The application did not start: the sheet closes with the reason, and the journey must not say "Applied".
      return { ...state, applySubmitting: false, applyStep: 'details', overlays: without(state.overlays, 'apply'), toast: action.message };
    case 'toggleNotif':
      return { ...state, notifs: { ...state.notifs, [action.key]: !state.notifs[action.key] } };
    case 'toggleHelp':
      return { ...state, helpExpanded: { ...state.helpExpanded, [action.id]: !state.helpExpanded[action.id] } };
    case 'setSearchQuery':
      return { ...state, searchQuery: action.value };
    case 'setSearchBeds':
      return { ...state, searchBeds: action.value };
    case 'setSearchPrice':
      return { ...state, searchPrice: action.value };
    case 'openExplore':
      return { ...state, screen: 'explore', overlays: [], exploreId: action.id };
    case 'setHistory':
      return state.historyLoaded ? state : { ...state, tourHistory: action.history, historyLoaded: true };
    case 'wfOpenPicker':
      return { ...state, wayfinding: { ...state.wayfinding, picker: action.which }, overlays: withOnTop(state.overlays, 'placePicker') };
    case 'wfSetEndpoint': {
      const wayfinding = { ...state.wayfinding, result: null, status: 'idle' as const, sim: initialSimulationState(state.wayfinding.sim.mode) };
      if (action.which === 'from') {
        wayfinding.from = action.node;
        wayfinding.fromFloor = action.floor;
      } else {
        wayfinding.to = action.node;
        wayfinding.toFloor = action.floor;
      }
      return { ...state, wayfinding, overlays: without(state.overlays, 'placePicker') };
    }
    case 'wfSwap':
      return {
        ...state,
        wayfinding: {
          ...state.wayfinding,
          from: state.wayfinding.to,
          fromFloor: state.wayfinding.toFloor,
          to: state.wayfinding.from,
          toFloor: state.wayfinding.fromFloor,
          result: null,
          status: 'idle',
          sim: initialSimulationState(state.wayfinding.sim.mode)
        }
      };
    case 'wfToggleStepFree':
      return { ...state, wayfinding: { ...state.wayfinding, stepFree: !state.wayfinding.stepFree, result: null, status: 'idle', sim: initialSimulationState(state.wayfinding.sim.mode) } };
    case 'wfToggleAvoidBlockers':
      return { ...state, wayfinding: { ...state.wayfinding, avoidBlockers: !state.wayfinding.avoidBlockers, result: null, status: 'idle', sim: initialSimulationState(state.wayfinding.sim.mode) } };
    case 'wfClear':
      return { ...state, wayfinding: { ...initialWayfinding(), view: state.wayfinding.view } };
    case 'wfCalculating':
      return { ...state, wayfinding: { ...state.wayfinding, status: 'calculating', result: null, sim: initialSimulationState(state.wayfinding.sim.mode) } };
    case 'wfResult': {
      const stage = action.result.ok ? action.result.route.stages[0] : null;
      return { ...state, wayfinding: { ...state.wayfinding, status: 'idle', result: action.result, view: stage ? { level: stage.level, floor: stage.floor } : state.wayfinding.view, sim: initialSimulationState(state.wayfinding.sim.mode) } };
    }
    case 'wfView':
      return { ...state, wayfinding: { ...state.wayfinding, view: action.view }, floorByLevel: { ...state.floorByLevel, [action.view.level]: action.view.floor } };
    case 'wfSim':
      return { ...state, wayfinding: { ...state.wayfinding, sim: action.sim } };
    case 'guidedView':
      return { ...state, guided: { ...state.guided, view: action.view }, floorByLevel: { ...state.floorByLevel, [action.view.level]: action.view.floor } };
    case 'guidedSim':
      return { ...state, guided: { ...state.guided, sim: action.sim } };
    case 'guidedStepFree':
      return { ...state, guided: { ...state.guided, stepFree: action.on } };
    case 'guidedRerouting':
      return { ...state, guided: { ...state.guided, rerouting: action.on } };
    case 'setFloor':
      return { ...state, floorByLevel: { ...state.floorByLevel, [action.level]: action.floor } };
    case 'addStop':
      if (state.tourOrder.includes(action.node)) return { ...state, overlays: without(state.overlays, 'addStop') };
      return { ...state, tourOrder: [...state.tourOrder, action.node], selected: { ...state.selected, [action.node]: true }, overlays: without(state.overlays, 'addStop') };
    case 'tourUpdated': {
      const current = state.tourOrder[state.stopIndex];
      const index = Math.max(0, action.order.indexOf(current));
      return { ...state, tourOrder: action.order, stopIndex: index, guided: { ...state.guided, status: 'ready', tour: action.tour, error: null, view: segmentView(action.tour, index) } };
    }
    case 'leaveTour':
      return { ...state, screen: 'home', overlays: [], unlockDrag: 0 };
    case 'resetTour':
      return { ...state, ...tourScoped(), screen: 'home', overlays: [] };

    // ── the design refresh ──
    case 'setDemo':
      return { ...state, demo: { ...state.demo, ...action.patch } };
    case 'resetDemo':
      return { ...state, demo: initialDemoScenarios() };
    case 'locAsk':
      return { ...state, location: { ...state.location, sheet: action.sheet }, overlays: withOnTop(state.overlays, 'location') };
    case 'locClose':
      return { ...state, location: { ...state.location, sheet: null }, overlays: without(state.overlays, 'location') };
    case 'locLocating':
      return { ...state, location: { perm: 'on', locating: true, sheet: null }, overlays: without(state.overlays, 'location') };
    case 'locLocated':
      return { ...state, location: { ...state.location, locating: false } };
    case 'locDeny':
      return { ...state, location: { perm: 'off', locating: false, sheet: null }, overlays: without(state.overlays, 'location') };
    case 'qrOpen':
      return { ...state, qrMode: action.mode, overlays: withOnTop(without(without(state.overlays, 'checkin'), 'location'), 'qr') };
    case 'linkStep':
      return { ...state, linkStep: action.step, overlays: action.step === 'enter' && !state.overlays.includes('link') ? withOnTop(state.overlays, 'link') : state.overlays };
    case 'openSchedule':
      return { ...state, screen: 'schedule', overlays: [], scheduleDone: false, schedule: action.draft };
    case 'setSchedule':
      return { ...state, schedule: { ...state.schedule, ...action.patch } };
    case 'confirmSchedule':
      return { ...state, scheduledTour: action.tour, scheduleDone: true, checkedIn: false, accessEndsAt: null, overlays: [], booking: { ...state.booking, saving: false, saveError: null, fetchedAt: 0 } };
    case 'syncBookings': {
      if (state.propertyId !== action.propertyId) return state;
      const local = state.scheduledTour;
      const live = !!local && local.status !== 'past' && local.status !== 'cancelled' && local.status !== 'missed';
      if (local?.bookingId != null) {
        const match = action.tours.find((t) => t.bookingId === local.bookingId);
        if (match) {
          // A tour checked in or finished on this phone keeps that state while the CMS still says upcoming (its end may not have been sent yet).
          const status = (local.status === 'checkedIn' || local.status === 'past') && match.status === 'scheduled' ? local.status : match.status;
          return { ...state, scheduledTour: { ...local, ...match, status, length: local.length, unit: local.unit, party: local.party, source: local.source, createdAt: local.createdAt } };
        }
        if (live) return { ...state, scheduledTour: { ...local, status: 'cancelled' } };
      }
      if (live) return state;
      const next = action.tours.find((t) => t.status === 'scheduled') ?? null;
      return next ? { ...state, scheduledTour: next } : state;
    }
    case 'verificationRequired':
      if (state.propertyId !== action.propertyId || state.verificationRequired === action.required) return state;
      return { ...state, verificationRequired: action.required };
    case 'bundleLoaded': {
      const keep = new Set(action.nodes);
      const tourOrder = state.tourOrder.filter((n) => keep.has(n));
      const selected = Object.fromEntries(Object.entries(state.selected).filter(([n]) => keep.has(n)));
      if (tourOrder.length === state.tourOrder.length && Object.keys(selected).length === Object.keys(state.selected).length) return state;
      const orderChanged = tourOrder.length !== state.tourOrder.length;
      const onTour = state.screen === 'guided' || state.screen === 'stop' || state.screen === 'tourReturn' || state.screen === 'arLive';
      return {
        ...state,
        tourOrder,
        selected,
        stopIndex: Math.min(state.stopIndex, Math.max(0, tourOrder.length - 1)),
        guided: orderChanged ? initialGuided() : state.guided,
        screen: orderChanged && onTour ? 'home' : state.screen,
        overlays: orderChanged && onTour ? [] : state.overlays,
        toast: orderChanged ? 'The tour stops changed. Build your tour again.' : state.toast
      };
    }
    case 'bookingStale':
      return state.booking.fetchedAt === 0 ? state : { ...state, booking: { ...state.booking, fetchedAt: 0 } };
    case 'adoptBooking': {
      const live = state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled' && state.scheduledTour.status !== 'missed';
      if (live && state.scheduledTour?.bookingId !== action.tour.bookingId) return state;
      return { ...state, scheduledTour: action.tour };
    }
    case 'bookingLoading':
      return { ...state, booking: { ...state.booking, propertyId: action.propertyId, status: 'loading', error: null, ...(state.booking.propertyId === action.propertyId ? {} : { settings: null, days: {} }) } };
    case 'bookingLoaded': {
      const days = Object.fromEntries(action.days.map((d) => [d.date, d]));
      const booking: BookingState = { ...state.booking, propertyId: action.propertyId, fetchedAt: action.now, status: 'ready', error: null, settings: action.settings, days };
      // The draft's day is the property's today when none was chosen or it has passed there (October 28,
      // 2026). It keeps its time when the day still offers it; otherwise the day's first bookable time,
      // and when the day has none at all, the first of the loaded days that does.
      let date = scheduleDay(state.schedule.date, action.settings.timeZone, action.now);
      let options = slotsForDay(booking, date, action.now);
      if (!options.length) {
        const open = action.days.map((d) => d.date).find((key) => key >= date && slotsForDay(booking, key, action.now).length > 0);
        if (open) {
          date = open;
          options = slotsForDay(booking, date, action.now);
        }
      }
      const time = options.includes(state.schedule.time) ? state.schedule.time : (options[0] ?? '');
      return { ...state, booking, schedule: { ...state.schedule, date, time } };
    }
    case 'bookingFailed':
      return { ...state, booking: { ...state.booking, status: 'error', error: action.message } };
    case 'bookingSaving':
      return { ...state, booking: { ...state.booking, saving: true, saveError: null } };
    case 'bookingSaveFailed':
      return { ...state, booking: { ...state.booking, saving: false, saveError: action.message } };
    case 'cancelTour':
      return { ...state, scheduledTour: state.scheduledTour ? { ...state.scheduledTour, status: 'cancelled' } : null, overlays: [], checkinFor: null };
    case 'openVerify':
      // The status is read on open; until it answers the intro waits (a verified visitor is moved on by `verifyStatus`).
      return { ...state, screen: 'verify', overlays: [], verify: { ...initialVerify(), then: action.then, statusLoading: true } };
    case 'verifyStatus': {
      if (state.propertyId !== action.propertyId) return { ...state, verify: { ...state.verify, statusLoading: false } };
      const info: VerificationInfo = { ...action.status, fetchedAt: action.now };
      return { ...state, verification: info, verificationRequired: info.required, verify: { ...state.verify, statusLoading: false, statusError: null, step: stepAfterStatus(state.verify.step, info) } };
    }
    case 'verifyStatusFailed':
      return { ...state, verify: { ...state.verify, statusLoading: false, statusError: { message: action.message, unavailable: action.unavailable } } };
    case 'verifyConsent':
      return { ...state, verify: { ...state.verify, consent: !state.verify.consent } };
    case 'verifyStep':
      return { ...state, verify: { ...state.verify, step: action.step, error: null } };
    case 'verifyDocumentType':
      return { ...state, verify: { ...state.verify, documentType: action.documentType, images: { front: null, back: null, selfie: null }, result: null, error: null, step: 'front' } };
    case 'verifyCaptured': {
      const images = { ...state.verify.images, [action.kind]: action.image };
      const step: VerifyStep = action.kind === 'front' ? (DOCUMENT_NEEDS_BACK[state.verify.documentType] ? 'back' : 'selfie') : 'selfie';
      return { ...state, verify: { ...state.verify, images, step } };
    }
    case 'verifyRetake':
      return { ...state, verify: { ...state.verify, images: { ...state.verify.images, [action.kind]: null }, step: action.kind, error: null } };
    case 'verifySubmitting':
      return { ...state, verify: { ...state.verify, step: 'submitting', result: null, error: null } };
    case 'verifyResult': {
      const passed = action.outcome === 'verified' || action.outcome === 'already_verified';
      const info: VerificationInfo = { ...action.status, fetchedAt: action.now };
      const mine = state.propertyId === action.propertyId;
      const step: VerifyStep = passed ? (info.card.needed ? 'card' : 'done') : 'result';
      return {
        ...state,
        ...(mine ? { verification: info, verificationRequired: info.required } : {}),
        verify: { ...state.verify, step, images: { front: null, back: null, selfie: null }, result: { outcome: action.outcome, reason: action.reason }, error: null }
      };
    }
    case 'verifyFailed':
      return { ...state, verify: { ...state.verify, step: 'result', result: null, error: { code: action.code, message: action.message, retryable: action.retryable }, images: action.retryable ? state.verify.images : { front: null, back: null, selfie: null } } };
    case 'verifyCardSaving':
      return { ...state, verify: { ...state.verify, cardSaving: true, cardError: null } };
    case 'verifyCardSaved': {
      const info: VerificationInfo = { ...action.status, fetchedAt: action.now };
      const mine = state.propertyId === action.propertyId;
      return { ...state, ...(mine ? { verification: info, verificationRequired: info.required } : {}), verify: { ...state.verify, cardSaving: false, cardError: null, step: info.card.needed ? 'card' : 'done' } };
    }
    case 'verifyCardFailed':
      return { ...state, verify: { ...state.verify, cardSaving: false, cardError: action.message } };
    case 'verifyFinish':
      return { ...state, screen: 'home', overlays: [], verify: initialVerify() };
    case 'openCheckin':
      return { ...state, checkinFor: action.for, overlays: withOnTop(without(state.overlays, 'upcoming'), 'checkin') };
    case 'checkIn':
      return {
        ...state,
        checkedIn: true,
        virtualTour: false,
        accessEndsAt: action.now + action.accessMs,
        passStart: action.now,
        overlays: [],
        visit: action.visit === undefined ? state.visit : action.visit,
        scheduledTour: state.scheduledTour && state.scheduledTour.status !== 'past' ? { ...state.scheduledTour, status: 'checkedIn' } : state.scheduledTour
      };
    case 'visitStarted':
      if (state.visit?.clientVisitId !== action.clientVisitId) return state;
      return { ...state, visit: { ...state.visit, id: action.id, status: state.visit.end ? 'ended' : 'active' }, accessEndsAt: action.accessEndsAt ?? state.accessEndsAt };
    case 'visitLocal':
      if (state.visit?.clientVisitId !== action.clientVisitId) return state;
      return { ...state, visit: { ...state.visit, status: 'local' } };
    case 'visitEnding':
      if (state.visit?.clientVisitId !== action.clientVisitId) return state;
      return { ...state, visit: { ...state.visit, status: 'ended', end: state.visit.end ?? action.end } };
    case 'visitClosed':
      return state.visit?.clientVisitId === action.clientVisitId ? { ...state, visit: null } : state;
    case 'extendAccess':
      return { ...state, accessEndsAt: Math.max(state.accessEndsAt ?? 0, Date.now()) + action.ms };
    case 'goTourStart':
      return { ...state, screen: 'tourStart', overlays: [], virtualTour: action.virtual, startPointId: action.startPointId ?? state.startPointId };
    case 'setStartPoint':
      return { ...state, startPointId: action.id };
    case 'continueToBuild': {
      const anySelected = Object.values(state.selected).some(Boolean);
      const selected: Record<string, boolean> = {};
      (action.selectAll ?? []).forEach((n) => {
        selected[n] = true;
      });
      return { ...state, screen: 'buildTour', overlays: [], selected: anySelected || !action.selectAll ? state.selected : selected, build: { ...state.build, focusNode: null, previewNode: null } };
    }
    case 'openSkip':
      return { ...state, overlays: withOnTop(state.overlays, 'skip'), skipReason: null };
    case 'setSkipReason':
      return { ...state, skipReason: action.reason };
    case 'skipStop': {
      const skipped = { ...state.skipped, [action.node]: action.reason };
      const next = { ...state, skipped, overlays: without(state.overlays, 'skip'), skipReason: null };
      if (state.stopIndex + 1 < state.tourOrder.length) return toStop(next, state.stopIndex + 1);
      if (state.virtualTour || state.tourMode === 'ar') return next;
      return { ...next, screen: 'tourReturn' };
    }
    case 'setReaction': {
      const reactions: Record<string, Reaction> = { ...state.reactions };
      if (reactions[action.node] === action.reaction) delete reactions[action.node];
      else reactions[action.node] = action.reaction;
      return { ...state, reactions };
    }
    case 'toggleFavourite':
      return { ...state, favourites: { ...state.favourites, [action.node]: !state.favourites[action.node] } };
    case 'addPhoto': {
      const shots = action.dataUrl ? { ...state.shots, [action.node]: [...(state.shots[action.node] ?? []), action.dataUrl].slice(-8) } : state.shots;
      return { ...state, shots, photos: { ...state.photos, [action.node]: Math.min(8, (state.photos[action.node] ?? 0) + 1) } };
    }
    case 'setDemoMethod':
      return { ...state, demoMethod: { ...state.demoMethod, [action.node]: action.method } };
    case 'codeEntered':
      return { ...state, codeEntered: { ...state.codeEntered, [action.node]: true } };
    case 'locateStop':
      // "Show on map" from a stop: back to the guided map, on the stop's own floor, centred on it.
      return {
        ...state,
        screen: state.tourMode === 'ar' ? 'arLive' : 'guided',
        overlays: [],
        guided: action.view ? { ...state.guided, view: action.view } : state.guided,
        floorByLevel: action.view ? { ...state.floorByLevel, [action.view.level]: action.view.floor } : state.floorByLevel,
        build: { ...state.build, focusNode: action.node }
      };
    case 'toggleCompare':
      return { ...state, compare: { ...state.compare, [action.node]: !state.compare[action.node] } };
    case 'holdUnit':
      return { ...state, holds: { ...state.holds, [action.node]: true } };
    case 'setLeaseTerm':
      return { ...state, leaseTerm: action.term };
    case 'toggleAudio':
      return { ...state, audioOn: !state.audioOn };
    case 'narration':
      return { ...state, narration: { node: action.node, base: action.base, startAt: action.startAt } };
    case 'setSurvey':
      return { ...state, survey: { ...state.survey, ...action.patch } };
    case 'buildView':
      return { ...state, build: { ...state.build, ...action.patch } };
    default:
      return state;
  }
};

export { initialSchedule };
