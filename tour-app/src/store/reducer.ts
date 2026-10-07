import type { RouteResult, TourHistoryEntry, TourRoute } from '~/models';
import { backScreenOf, topOverlay, type Overlay, type Screen } from '~/navigation/screens';
import { initialSimulationState, type SimulationState } from '~/wayfinding/simulation';
import { initialAppState, initialGuided, initialWayfinding, type AiMessage, type AppState, type MapView, type PersistedState, type TourMode } from './appState';

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
  | { type: 'selectProperty'; propertyId: number }
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
  | { type: 'arrive' }
  | { type: 'nextStop'; propertyName: string; names: string[]; date: string }
  | { type: 'exitStop' }
  | { type: 'unlockDrag'; pct: number }
  | { type: 'unlockRelease'; node: string }
  | { type: 'openNote'; node: string }
  | { type: 'setNoteDraft'; value: string }
  | { type: 'saveNote'; node: string }
  | { type: 'toast'; message: string | null }
  | { type: 'openAiChat'; context: 'stop' | 'general'; greeting: string }
  | { type: 'setAiInput'; value: string }
  | { type: 'aiAsk'; question: string }
  | { type: 'aiReply'; text: string }
  | { type: 'aiHuman'; text: string }
  | { type: 'openBook'; day: string; time: string; unit: string }
  | { type: 'setBook'; field: 'day' | 'time' | 'unit'; value: string }
  | { type: 'bookSubmitting' }
  | { type: 'bookDone' }
  | { type: 'openApply'; unit: string }
  | { type: 'pickApplyUnit'; unit: string }
  | { type: 'applySubmitting' }
  | { type: 'applyDone'; message: string }
  | { type: 'toggleNotif'; key: 'tours' | 'priceDrops' | 'newUnits' }
  | { type: 'toggleHelp'; id: string }
  | { type: 'setSearchQuery'; value: string }
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
  | { type: 'setFloor'; level: string; floor: number | null }
  | { type: 'addStop'; node: string }
  | { type: 'tourUpdated'; tour: TourRoute; order: string[] }
  | { type: 'leaveTour' }
  | { type: 'resetTour' };

const without = (overlays: Overlay[], overlay: Overlay) => overlays.filter((o) => o !== overlay);

const firstView = (tour: TourRoute | null): MapView | null => {
  const stage = tour?.segments[0]?.route.stages[0] ?? tour?.route.stages[0];
  return stage ? { level: stage.level, floor: stage.floor } : null;
};

const segmentView = (tour: TourRoute | null, index: number): MapView | null => {
  const stage = tour?.segments[index]?.route.stages[0];
  return stage ? { level: stage.level, floor: stage.floor } : firstView(tour);
};

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'hydrate': {
      const next = { ...state, ...action.state, auth: { status: 'idle' as const, error: null } };
      // A simulation that was playing resumes paused; overlays never persist.
      next.wayfinding = { ...next.wayfinding, status: 'idle', sim: { ...next.wayfinding.sim, status: next.wayfinding.sim.status === 'playing' ? 'paused' : next.wayfinding.sim.status } };
      next.guided = { ...next.guided, status: next.guided.tour ? 'ready' : 'idle', sim: { ...next.guided.sim, status: next.guided.sim.status === 'playing' ? 'paused' : next.guided.sim.status } };
      next.overlays = [];
      next.toast = null;
      return next;
    }
    case 'navigate':
      return { ...state, screen: action.screen, overlays: [] };
    case 'back': {
      const top = topOverlay(state.overlays);
      if (top) return { ...state, overlays: without(state.overlays, top) };
      const target = backScreenOf(state.screen, state.tourMode);
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
      return { ...state, screen: state.signedIn ? 'home' : 'onboarding' };
    case 'onboardNext':
      return state.onboardIndex >= action.count - 1 ? { ...state, screen: 'login' } : { ...state, onboardIndex: state.onboardIndex + 1 };
    case 'onboardPrev':
      return { ...state, onboardIndex: Math.max(0, state.onboardIndex - 1) };
    case 'skipOnboard':
      return { ...state, screen: 'login' };
    case 'setEmail':
      return { ...state, email: action.value };
    case 'setPassword':
      return { ...state, password: action.value };
    case 'loginStart':
      return { ...state, auth: { status: 'busy', error: null } };
    case 'loginFailed':
      return { ...state, auth: { status: 'error', error: action.message } };
    case 'loginSucceeded':
      return { ...state, screen: action.propertyId != null ? 'home' : 'search', signedIn: true, user: action.user, propertyId: action.propertyId, password: '', auth: { status: 'idle', error: null } };
    case 'selectProperty':
      if (state.propertyId === action.propertyId) return { ...state, screen: 'home', overlays: [], searchQuery: '' };
      // A new property: every tour, route and selection belonged to the old one.
      return { ...state, propertyId: action.propertyId, screen: 'home', overlays: [], searchQuery: '', selected: {}, tourOrder: [], stopIndex: 0, unlocked: {}, unlockDrag: 0, notes: {}, guided: initialGuided(), wayfinding: initialWayfinding(), floorByLevel: {} };
    case 'sessionExpired':
      return { ...initialAppState(), screen: 'login', signedIn: false, email: state.email, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey, toast: action.message };
    case 'signOut':
      return { ...initialAppState(), screen: 'login', signedIn: false, tourHistory: state.tourHistory, historyLoaded: state.historyLoaded, notifs: state.notifs, journey: state.journey };
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
      const guided = { status: 'ready' as const, tour: action.tour, error: null, view: firstView(action.tour), sim: initialSimulationState('stop') };
      return { ...state, tourMode: action.mode, tourOrder: action.order, stopIndex: 0, unlocked: {}, screen: action.mode === 'ar' ? 'arLive' : 'guided', overlays: [], guided };
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
      return { ...state, screen: 'guided', stopIndex: 0, guided: { ...state.guided, view: segmentView(state.guided.tour, 0), sim: initialSimulationState(state.guided.sim.mode) } };
    case 'jumpToStop': {
      const index = state.tourOrder.indexOf(action.node);
      if (index < 0) return state;
      // Jumping from the itinerary closes it, so the map is visible at once.
      return { ...state, stopIndex: index, screen: 'guided', overlays: without(state.overlays, 'itinerary'), guided: { ...state.guided, view: segmentView(state.guided.tour, index), sim: initialSimulationState(state.guided.sim.mode) } };
    }
    case 'arrive': {
      const node = state.tourOrder[state.stopIndex];
      if (!node) return state;
      return node.startsWith('unit:') ? { ...state, screen: 'unlockUnit', unlockDrag: 0 } : { ...state, screen: 'stopDetail' };
    }
    case 'nextStop': {
      if (state.stopIndex + 1 < state.tourOrder.length) {
        const index = state.stopIndex + 1;
        return { ...state, stopIndex: index, screen: 'guided', overlays: [], guided: { ...state.guided, view: segmentView(state.guided.tour, index), sim: initialSimulationState(state.guided.sim.mode) } };
      }
      const entry: TourHistoryEntry = { id: `h-${Date.now()}`, property: action.propertyName, date: action.date, tags: action.names };
      return { ...state, screen: 'tourComplete', overlays: [], journey: { ...state.journey, toured: true }, tourHistory: [entry, ...state.tourHistory] };
    }
    case 'exitStop':
      return { ...state, screen: state.tourMode === 'ar' ? 'arLive' : 'guided', overlays: [] };
    case 'unlockDrag':
      return { ...state, unlockDrag: Math.max(0, Math.min(100, action.pct)) };
    case 'unlockRelease':
      return state.unlockDrag >= 85 ? { ...state, unlockDrag: 100, unlocked: { ...state.unlocked, [action.node]: true } } : { ...state, unlockDrag: 0 };
    case 'openNote':
      return { ...state, overlays: [...without(state.overlays, 'note'), 'note'], noteDraft: state.notes[action.node] ?? '' };
    case 'setNoteDraft':
      return { ...state, noteDraft: action.value };
    case 'saveNote':
      return { ...state, notes: { ...state.notes, [action.node]: state.noteDraft }, overlays: without(state.overlays, 'note') };
    case 'toast':
      return { ...state, toast: action.message };
    case 'openAiChat':
      return { ...state, overlays: [...without(state.overlays, 'aiChat'), 'aiChat'], ai: { context: action.context, messages: [{ role: 'ai', text: action.greeting }], input: '', typing: false } };
    case 'setAiInput':
      return { ...state, ai: { ...state.ai, input: action.value } };
    case 'aiAsk': {
      const message: AiMessage = { role: 'user', text: action.question };
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, message], input: '', typing: true } };
    }
    case 'aiReply':
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, { role: 'ai', text: action.text }], typing: false } };
    case 'aiHuman':
      return { ...state, ai: { ...state.ai, messages: [...state.ai.messages, { role: 'ai', text: action.text }], typing: false } };
    case 'openBook':
      return { ...state, overlays: [...without(state.overlays, 'book'), 'book'], book: { day: action.day, time: action.time, unit: action.unit, done: false, submitting: false } };
    case 'setBook':
      return { ...state, book: { ...state.book, [action.field]: action.value } };
    case 'bookSubmitting':
      return { ...state, book: { ...state.book, submitting: true } };
    case 'bookDone':
      return { ...state, book: { ...state.book, submitting: false, done: true }, journey: { ...state.journey, booked: true } };
    case 'openApply':
      return { ...state, overlays: [...without(state.overlays, 'apply'), 'apply'], applyUnit: action.unit, applySubmitting: false };
    case 'pickApplyUnit':
      return { ...state, applyUnit: action.unit };
    case 'applySubmitting':
      return { ...state, applySubmitting: true };
    case 'applyDone':
      return { ...state, applySubmitting: false, overlays: without(state.overlays, 'apply'), toast: action.message, journey: { ...state.journey, applied: true } };
    case 'toggleNotif':
      return { ...state, notifs: { ...state.notifs, [action.key]: !state.notifs[action.key] } };
    case 'toggleHelp':
      return { ...state, helpExpanded: { ...state.helpExpanded, [action.id]: !state.helpExpanded[action.id] } };
    case 'setSearchQuery':
      return { ...state, searchQuery: action.value };
    case 'setHistory':
      return state.historyLoaded ? state : { ...state, tourHistory: action.history, historyLoaded: true };
    case 'wfOpenPicker':
      return { ...state, wayfinding: { ...state.wayfinding, picker: action.which }, overlays: [...without(state.overlays, 'placePicker'), 'placePicker'] };
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
      return { ...state, screen: 'home', overlays: [], selected: {}, tourOrder: [], stopIndex: 0, unlocked: {}, unlockDrag: 0, guided: initialGuided() };
    default:
      return state;
  }
};
