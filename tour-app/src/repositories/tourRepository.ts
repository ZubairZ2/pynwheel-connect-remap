import type {
  Amenity,
  Building,
  ConciergeAnswer,
  HelpItem,
  Listing,
  MapLevel,
  OnboardingSlide,
  Place,
  Property,
  PropertyListing,
  RouteOptions,
  RouteResult,
  TourHistoryEntry,
  TourRouteResult,
  TourStopPlace,
  Unit,
  Visitor,
  WayfindingGraph
} from '~/models';
import type { Session } from '~/services/session';

/**
 * The data boundary of the Tour App.
 *
 *   UI (screens, hooks)
 *     ↓
 *   TourRepository               ← this interface
 *     ↓
 *   PynwheelApiTourRepository    the configured provider: the Pynwheel Tour App API (the Rails CMS, Api::TourApp::V1)
 *   DummyTourRepository          development only (VITE_TOUR_DATA_SOURCE=dummy): local demo data marked `*`
 *
 * Screens depend on this interface only. The provider never falls back from
 * one to the other: an API failure is a real error state, never demo data.
 */

/** Everything the map needs about one property, in one read. */
export interface PropertyBundle {
  property: Property;
  buildings: Building[];
  levels: MapLevel[];
  graph: WayfindingGraph;
  units: Unit[];
  amenities: Amenity[];
  stops: TourStopPlace[];
  /** AR pin positions by node when the data has them (the app spreads the rest). */
  arPins: Record<string, { top: string; left: string }>;
  /** "Floor 1" / "Tower A · Floor 2" per place node. */
  floorLabels: Record<string, string>;
  /** True for demo data: the UI then marks derived labels with `*`. */
  demo: boolean;
}

/** The app's non-map content (visitor, listings, help …). */
export interface AppContent {
  visitor: Visitor;
  firstName: string;
  nearbyProperties: PropertyListing[];
  hiRiseListings: Listing[];
  tourHistory: TourHistoryEntry[];
  onboarding: OnboardingSlide[];
  arInitLabels: string[];
  help: HelpItem[];
  supportEmail: string;
  concierge: {
    answers: ConciergeAnswer[];
    fallback: string;
    greetingStop: string;
    greetingGeneral: string;
    humanReply: string;
    prompts: { label: string; question: string }[];
  };
  booking: { days: string[]; times: string[] };
  /** `percent` 0 = no best-match scoring available (nothing is shown). */
  bestMatch: { reasons: string[]; percent: number };
  appVersion: string;
}

export interface BookingRequest {
  day: string;
  time: string;
  unit: string;
  name: string;
  phone: string;
}

export type { TourRouteResult };

/** How far a stop is from the tour's starting point, for the stop cards and AR labels ("45 ft ↑"). */
export interface StopDistance {
  lengthPx: number;
  lengthFt: number | null;
  durationS: number | null;
  direction: 'up' | 'down' | 'level';
  /** Null when the stop can be reached; else the route error message. */
  unreachable: string | null;
}

export interface TourRepository {
  /** Identifies the provider in the UI's dummy-data legend and the docs. */
  readonly source: 'dummy' | 'pynwheel-api';

  // --- session
  /** Signs in with Pynwheel credentials; resolves the session or throws an error whose message can be shown. */
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  /** The persisted session, when one exists and is still usable. */
  restoreSession(): Promise<Session | null>;
  /** Called when the backend says the session is gone (expired / revoked). */
  onSessionExpired(handler: (message: string) => void): () => void;

  // --- property selection
  getProperties(): Promise<PropertyListing[]>;
  selectProperty(propertyId: number): Promise<void>;
  currentPropertyId(): number | null;

  // --- the selected property
  getProperty(): Promise<PropertyBundle>;
  getContent(): Promise<AppContent>;
  /** Every place a route can start or end at, for the From / To picker. */
  getPlaces(): Promise<Place[]>;
  /** The level's floor SVG document (through the API, with the session token). Rejects when the level has none or it cannot be fetched. */
  getLevelSvg(level: MapLevel): Promise<Blob>;
  findRoute(from: string, to: string, options?: RouteOptions): Promise<RouteResult>;
  /** The tour's route through the chosen stops (all visible stops when null). */
  getTourRoute(stopNodes: string[] | null, options?: RouteOptions): Promise<TourRouteResult>;
  /** Distance from the tour start to each of the given stops (one call, so the stop lists can show "45 ft"). */
  getStopDistances(nodes: string[]): Promise<Record<string, StopDistance>>;
  askConcierge(question: string, context: { stopName: string | null }): Promise<string>;
  requestBooking(request: BookingRequest): Promise<{ id: string }>;
  startApplication(unitNode: string): Promise<{ id: string }>;
}

/** Thrown by a provider for a feature its backend does not offer. */
export class FeatureUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not available for this property yet.`);
    this.name = 'FeatureUnavailableError';
  }
}

/** Thrown when the app is built without a usable data source configuration. */
export class RepositoryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryConfigurationError';
  }
}
