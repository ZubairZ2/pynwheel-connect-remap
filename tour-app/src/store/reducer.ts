import type { LockBluetoothKey, LockPin, RouteResult, TourHistoryEntry, TourRoute } from '~/models';
import { DEMO_SCENARIOS_ENABLED } from '~/config/env';
import { backScreenOf, topOverlay, type Overlay, type Screen } from '~/navigation/screens';
import { initialSimulationState, type SimulationState } from '~/wayfinding/simulation';
import {
  initialAppState,
  initialDemoScenarios,
  initialGuided,
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
  type VerifyStep
} from './appState';

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
  | { type: 'loginSucceeded'; user: { name: string; email: string }; propertyId: number | null }
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
  | { type: 'finishTour'; entry: TourHistoryEntry; pass: TourPass | null }
  | { type: 'exitStop' }
  | { type: 'unlockDrag'; pct: number }
  | { type: 'unlockRelease'; node: string }
  | { type: 'demoUnlock'; node: string }
  | { type: 'lockPinStart'; node: string }
  | { type: 'lockPinReady'; node: string; propertyId: number | null; pin: LockPin }
  | { type: 'lockPinFailed'; node: string; propertyId: number | null; message: string }
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
  | { type: 'cancelTour' }
  | { type: 'openVerify'; then: 'start' | null }
  | { type: 'verifyStep'; step: VerifyStep }
  | { type: 'verifyConsent' }
  | { type: 'verifyScanning'; on: boolean }
  | { type: 'verifyCard'; field: 'number' | 'expiry' | 'zip'; value: string }
  | { type: 'toggleRequireCard' }
  | { type: 'verified' }
  | { type: 'verifyFinish' }
  | { type: 'openCheckin'; for: string | null }
  | { type: 'checkIn'; now: number; accessMs: number }
  | { type: 'extendAccess'; ms: number }
  | { type: 'goTourStart'; startPointId: string | null; virtual: boolean }
  | { type: 'setStartPoint'; id: string }
  | { type: 'continueToBuild'; selectAll: string[] | null }
  | { type: 'openSkip' }
  | { type: 'setSkipReason'; reason: string }
  | { type: 'skipStop'; node: string; reason: string }
  | { type: 'setReaction'; node: string; reaction: Reaction }
  | { type: 'toggleFavourite'; node: string }
  | { type: 'addPhoto'; node: string }
  | { type: 'toggleCompare'; node: string }
  | { type: 'holdUnit'; node: string }
  | { type: 'setLeaseTerm'; term: AppState['leaseTerm'] }
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
  guided: initialGuided(),
  wayfinding: initialWayfinding(),
  floorByLevel: {},
  scheduledTour: null,
  scheduleDone: false,
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

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'hydrate': {
      const next: AppState = { ...state, ...action.state, auth: { status: 'idle', error: null } };
      // A simulation that was playing resumes paused; overlays never persist.
      next.wayfinding = { ...initialWayfinding(), ...next.wayfinding, status: 'idle', sim: { ...next.wayfinding.sim, status: next.wayfinding.sim.status === 'playing' ? 'paused' : next.wayfinding.sim.status } };
      next.guided = { ...initialGuided(), ...next.guided, status: next.guided.tour ? 'ready' : 'idle', sim: { ...next.guided.sim, status: next.guided.sim.status === 'playing' ? 'paused' : next.guided.sim.status } };
      next.overlays = [];
      next.toast = null;
      next.lockRequest = null;
      next.lockPins = next.lockPins ?? {};
      next.lockKeys = {};
      // A build without the Demo scenarios panel cannot reset a forced scenario, so it never restores one.
      next.demo = DEMO_SCENARIOS_ENABLED ? { ...initialDemoScenarios(), ...(next.demo ?? {}) } : initialDemoScenarios();
      next.notifs = { ...initialAppState().notifs, ...(next.notifs ?? {}) };
      next.authStep = 'email';
      next.location = { ...state.location, sheet: null, locating: false };
      next.verify = initialVerify();
      // An access window that ended while the app was closed is over.
      if (next.accessEndsAt != null && next.accessEndsAt <= Date.now()) {
        next.checkedIn = false;
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
      // The design confirms the profile ("Does everything look good?") before Home.
      return { ...state, screen: 'getStarted', authStep: 'confirm', signedIn: true, guest: false, guestProperty: null, user: action.user, propertyId: action.propertyId, password: '', editingProfile: false, auth: { status: 'idle', error: null } };
    case 'confirmProfile': {
      const pending = state.pendingAfterAuth;
      const screen: Screen = state.propertyId == null ? 'search' : pending === 'schedule' ? 'schedule' : 'home';
      const overlays: Overlay[] = state.propertyId != null && pending === 'book' ? ['book'] : state.propertyId != null && pending === 'upcoming' ? ['upcoming'] : state.propertyId != null && pending === 'history' ? ['history'] : [];
      // Without a property the visitor picks one first; a pending Schedule survives so `selectProperty` can open it.
      const keep = state.propertyId == null && pending === 'schedule' ? pending : null;
      return { ...state, screen, overlays, authStep: 'email', editingProfile: false, pendingAfterAuth: keep, guestGateWhy: null, scheduleDone: false };
    }
    case 'editProfile':
      return { ...state, editingProfile: action.on };
    case 'setProfileField':
      return { ...state, profileEdits: { ...state.profileEdits, [action.field]: action.value } };
    case 'authBack':
      // Back from the confirmation abandons the sign-in: the session is gone (the action logs the token out).
      if (state.authStep === 'confirm') return { ...state, authStep: 'email', editingProfile: false, signedIn: false, user: null, propertyId: null, password: '', profileEdits: {} };
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
      if (state.propertyId === action.propertyId) return { ...state, screen: then === 'schedule' ? 'schedule' : 'home', overlays: [], searchQuery: '', pendingAfterAuth: null };
      // A new property: every tour, route and selection belonged to the old one.
      return { ...state, ...propertyScoped(), propertyId: action.propertyId, screen: then === 'schedule' ? 'schedule' : 'home', overlays: [], searchQuery: '', pendingAfterAuth: null, exploreId: null };
      }
    case 'sessionExpired':
      return { ...initialAppState(), screen: 'getStarted', signedIn: false, email: state.email, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey, demo: state.demo, toast: action.message };
    case 'signOut':
      // `verified` belongs to the account that signed out: the next account on this phone must not inherit it.
      return { ...initialAppState(), screen: 'getStarted', signedIn: false, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey, demo: state.demo };
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
      return { ...state, tourMode: action.mode, tourOrder: action.order, stopIndex: 0, unlocked: {}, lockPins: {}, lockKeys: {}, lockRequest: null, skipped: {}, screen: action.mode === 'ar' ? 'arLive' : 'guided', overlays: [], guided };
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
        scheduledTour: state.scheduledTour ? { ...state.scheduledTour, status: 'past' } : null,
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
      return { ...state, lockRequest: { node: action.node, propertyId: action.propertyId, status: 'error', error: action.message } };
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
      return { ...state, scheduledTour: action.tour, scheduleDone: true, checkedIn: false, accessEndsAt: null, overlays: [] };
    case 'cancelTour':
      return { ...state, scheduledTour: state.scheduledTour ? { ...state.scheduledTour, status: 'cancelled' } : null, overlays: [], checkinFor: null };
    case 'openVerify':
      return { ...state, screen: 'verify', overlays: [], verify: { ...initialVerify(), step: state.verified ? 'done' : 'intro', then: action.then } };
    case 'verifyStep':
      return { ...state, verify: { ...state.verify, step: action.step, scanning: false } };
    case 'verifyConsent':
      return { ...state, verify: { ...state.verify, consent: !state.verify.consent } };
    case 'verifyScanning':
      return { ...state, verify: { ...state.verify, scanning: action.on } };
    case 'verifyCard':
      return { ...state, verify: { ...state.verify, card: { ...state.verify.card, [action.field]: action.value } } };
    case 'toggleRequireCard': {
      const requireCard = !state.requireCard;
      // Turning the card off while on the card step completes the check.
      const onCard = state.verify.step === 'card' && !requireCard;
      return { ...state, requireCard, verified: onCard ? true : state.verified, verify: onCard ? { ...state.verify, step: 'done' } : state.verify };
    }
    case 'verified':
      return { ...state, verified: true, verify: { ...state.verify, step: 'done', scanning: false } };
    case 'verifyFinish':
      return { ...state, screen: 'home', overlays: [], verify: { ...state.verify, then: null } };
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
        scheduledTour: state.scheduledTour && state.scheduledTour.status !== 'past' ? { ...state.scheduledTour, status: 'checkedIn' } : state.scheduledTour
      };
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
    case 'addPhoto':
      return { ...state, photos: { ...state.photos, [action.node]: Math.min(4, (state.photos[action.node] ?? 0) + 1) } };
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
