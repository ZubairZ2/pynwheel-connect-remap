import type { RouteResult, TourHistoryEntry, TourRoute } from '~/models';
import type { Overlay, Screen } from '~/navigation/screens';
import { initialSimulationState, type SimulationState } from '~/wayfinding/simulation';

/**
 * The whole UI state of the app, as the reference keeps it in one React
 * component's `state`. It is a plain object: the reducer is pure, the
 * provider persists a subset of it (see `PERSISTED_KEYS`) and restores it
 * on launch, so backgrounding or relaunching the app returns the visitor
 * to the same floor, From, To, route and simulation.
 */

export const STATE_VERSION = 1;

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
}

export interface AuthState {
  status: 'idle' | 'busy' | 'error';
  error: string | null;
}

export interface AppState {
  screen: Screen;
  overlays: Overlay[];
  /** Whether the visitor has signed in (the session itself lives in the repository's session store). */
  signedIn: boolean;
  /** Who is signed in, for the Profile screen. */
  user: { name: string; email: string } | null;
  /** The selected property (null right after sign-in until one is chosen). */
  propertyId: number | null;
  auth: AuthState;
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
  notes: Record<string, string>;
  noteDraft: string;
  tourHistory: TourHistoryEntry[];
  historyLoaded: boolean;
  arInitStep: number;
  ai: { context: 'stop' | 'general'; messages: AiMessage[]; input: string; typing: boolean };
  book: { day: string; time: string; unit: string; done: boolean; submitting: boolean };
  applyUnit: string | null;
  applySubmitting: boolean;
  notifs: { tours: boolean; priceDrops: boolean; newUnits: boolean };
  helpExpanded: Record<string, boolean>;
  searchQuery: string;
  toast: string | null;
  journey: { toured: boolean; booked: boolean; applied: boolean; followup: boolean };
  agent: { name: string; initials: string } | null;
  wayfinding: WayfindingState;
  guided: GuidedState;
  /** The last visitor-chosen floor per level (so coming back to a level shows the same floor). */
  floorByLevel: Record<string, number | null>;
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

export const initialGuided = (): GuidedState => ({ status: 'idle', tour: null, error: null, view: null, sim: initialSimulationState('point') });

export const initialAppState = (): AppState => ({
  screen: 'splash',
  overlays: [],
  signedIn: false,
  user: null,
  propertyId: null,
  auth: { status: 'idle', error: null },
  onboardIndex: 0,
  email: '',
  password: '',
  selected: {},
  tourOrder: [],
  tourMode: 'self',
  stopIndex: 0,
  unlocked: {},
  unlockDrag: 0,
  notes: {},
  noteDraft: '',
  tourHistory: [],
  historyLoaded: false,
  arInitStep: 0,
  ai: { context: 'general', messages: [], input: '', typing: false },
  book: { day: '', time: '', unit: '', done: false, submitting: false },
  applyUnit: null,
  applySubmitting: false,
  notifs: { tours: true, priceDrops: true, newUnits: false },
  helpExpanded: {},
  searchQuery: '',
  toast: null,
  journey: { toured: false, booked: false, applied: false, followup: false },
  agent: null,
  wayfinding: initialWayfinding(),
  guided: initialGuided(),
  floorByLevel: {}
});

/** What survives a relaunch. Overlays, drafts, the toast and in-flight requests do not. */
export const PERSISTED_KEYS = [
  'screen',
  'signedIn',
  'user',
  'propertyId',
  'selected',
  'tourOrder',
  'tourMode',
  'stopIndex',
  'unlocked',
  'notes',
  'tourHistory',
  'historyLoaded',
  'notifs',
  'journey',
  'wayfinding',
  'guided',
  'floorByLevel'
] as const satisfies readonly (keyof AppState)[];

export type PersistedState = Pick<AppState, (typeof PERSISTED_KEYS)[number]>;
