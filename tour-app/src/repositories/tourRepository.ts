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

/**
 * The data boundary of the Tour App.
 *
 *   UI (screens, hooks)
 *     ↓
 *   TourRepository              ← this interface
 *     ↓
 *   DummyTourRepository  today  — local dummy data, every value marked `*`
 *   PynwheelApiTourRepository   — later: GET /api/self_tour/v1/communities/:id/wayfinding.json,
 *                                 …/wayfinding/route.json, …/wayfinding/tour_route.json
 *
 * Screens depend on this interface only. Replacing the provider changes no
 * component, because every method answers the models in `~/models`, which
 * already follow the backend's serializer shapes.
 */

/** Everything the map needs about one property, in one read (what `wayfinding.json` answers). */
export interface PropertyBundle {
  property: Property;
  buildings: Building[];
  levels: MapLevel[];
  graph: WayfindingGraph;
  units: Unit[];
  amenities: Amenity[];
  stops: TourStopPlace[];
  /** AR pin positions by node, as the design places them. */
  arPins: Record<string, { top: string; left: string }>;
  /** "Floor 1 *" / "Rooftop *" per place node. */
  floorLabels: Record<string, string>;
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
  getProperty(): Promise<PropertyBundle>;
  getContent(): Promise<AppContent>;
  /** Every place a route can start or end at, for the From / To picker. */
  getPlaces(): Promise<Place[]>;
  findRoute(from: string, to: string, options?: RouteOptions): Promise<RouteResult>;
  /** The tour's route through the chosen stops (all visible stops when null). */
  getTourRoute(stopNodes: string[] | null, options?: RouteOptions): Promise<TourRouteResult>;
  /** Distance from the tour start to each of the given stops (one call, so the stop lists can show "45 ft"). */
  getStopDistances(nodes: string[]): Promise<Record<string, StopDistance>>;
  askConcierge(question: string, context: { stopName: string | null }): Promise<string>;
  requestBooking(request: BookingRequest): Promise<{ id: string }>;
  startApplication(unitNode: string): Promise<{ id: string }>;
}

/** Thrown by a provider that is not enabled in this build. */
export class RepositoryUnavailableError extends Error {
  constructor(provider: string) {
    super(`${provider} is not enabled in this build.`);
    this.name = 'RepositoryUnavailableError';
  }
}
