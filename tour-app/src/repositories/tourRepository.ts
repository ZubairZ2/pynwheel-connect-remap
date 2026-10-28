import type {
  Amenity,
  Building,
  ConciergeAnswer,
  HelpItem,
  Listing,
  LockBluetoothKey,
  LockPin,
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
import type { Capabilities, Session } from '~/services/session';
import type { VisitEventInput, VisitEventKind } from '~/services/visitQueue';

export type { Capabilities, VisitEventInput, VisitEventKind };

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

/**
 * The property's booking rules as the CMS Settings store them
 * (`GET /properties/{id}/booking/settings`, Scheduling::Settings trimmed for
 * the app). `bookable` is false when the widget's gates fail; `gateError` then
 * says why ("Scheduler is Disabled", …).
 */
export interface BookingSettings {
  propertyId: number;
  timeZone: string;
  bookable: boolean;
  schedulerEnabled: boolean;
  gateError: string | null;
  tourTypes: { selfTour: boolean; guidedTour: boolean };
  slotIntervalMinutes: number;
  onlyScheduledTour: boolean;
  gracePeriod: number | null;
  lengthStayLimit: number | null;
  window: { bufferMinutes: number; minimumNoticeMinutes: number; bookingHorizonDays: number | null };
  app: { afterHoursLabel: boolean; allowShorterTour: boolean; partySizeLimit: number; askUnit: boolean; showTextBooking: boolean };
  form: { showDesiredBedroom: boolean; showDesiredMoveInDate: boolean; creditCardRequired: boolean };
  closures: { date: string; label: string | null; closedAllDay: boolean }[];
  linkUrl: string | null;
}

/** One bookable time of a day: `time` is `HH:MM` (what the booking sends), `label` what the screen shows ("6:00 PM"). */
export interface AvailabilitySlot {
  time: string;
  label: string;
  /** The tour types still open at this time (`self_tour`, `guided_tour`). */
  types: string[];
  /** The tour types whose capacity is reached at this time. */
  full: string[];
}

export interface AvailabilityDay {
  /** `YYYY-MM-DD` in the property's time zone. */
  date: string;
  closed: boolean;
  beyondHorizon: boolean;
  closureLabel: string | null;
  slots: AvailabilitySlot[];
}

export interface AvailabilityWindow {
  timeZone: string;
  now: string;
  intervalMinutes: number;
  lastBookableDate: string | null;
  days: AvailabilityDay[];
}

/** A booking the app makes (`POST /properties/{id}/bookings`), validated and persisted by the CMS. */
export interface BookingRequest {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, a slot's `time`. */
  time: string;
  tourType: 'self_tour' | 'guided_tour';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode?: string;
  /** App-only context the CMS accepts and keeps out of the booking row. */
  desiredUnit?: string;
  lengthMinutes?: number;
  partySize?: number;
  /** The CMS Booking Form's optional fields (sent only when the property's form shows them). */
  desiredBedroom?: string;
  /** `YYYY-MM-DD` */
  desiredMoveInDate?: string;
}

export interface BookingResult {
  id: string;
  status: string;
  date: string;
  /** `HH:MM` */
  time: string;
  /** "6:00 PM" */
  timeLabel: string;
  endTime: string | null;
  /** The booked instant (ISO 8601 with the property's offset) and the property's IANA zone (October 25, 2026). */
  bookedAt: string | null;
  timeZone: string | null;
  tourType: string;
  /** True when the CMS moved the visitor's existing upcoming booking instead of adding one. */
  rescheduled: boolean;
  /** The CMS visitor (`tour_users.id`) the booking belongs to, when the CMS answered one. */
  visitorId: number | null;
}

/** One of the signed-in visitor's bookings, as `POST /visitor/otp/verify`, `GET /visitor/me` and `GET /properties/{id}/bookings` list them. */
export interface VisitorBooking {
  id: number;
  propertyId: number;
  propertyName: string | null;
  /** `upcoming` | `missed` | `completed` | `cancelled`. */
  status: string;
  /** `YYYY-MM-DD` */
  date: string | null;
  /** `HH:MM` */
  time: string | null;
  /** "6:00 PM" */
  timeLabel: string | null;
  endTime: string | null;
  /** The booked instant (ISO 8601 with the property's offset) and the property's IANA zone (October 25, 2026). */
  bookedAt: string | null;
  timeZone: string | null;
  tourType: string | null;
  /** `tour_app` when booked in this app. */
  createdBy: string | null;
}

/** `POST /visitor/otp`: the code was sent (always the same answer for a valid number). */
export interface VisitorCodeSent {
  /** Seconds before another code may be requested. */
  resendAfterS: number;
  /** Testing only: the code itself, when the server was started with PYN_TOUR_OTP_DEBUG=on. */
  debugCode?: string | null;
}

export interface VisitorVerifyRequest {
  phone: string;
  code: string;
  countryCode?: string;
  /** Asked only after `profile_required`: a new visitor's name and email. */
  firstName?: string;
  lastName?: string;
  email?: string;
  propertyId?: number | null;
}

export interface VisitorProfilePatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  smsEnabled?: boolean;
}

/** `POST /properties/{id}/visits`: the check-in the CMS records (`Visits::Start`). */
export interface VisitStartInput {
  /** A UUID made once per check-in and kept, so a retry answers the same visit. */
  clientVisitId: string;
  bookingId?: number | null;
  tourType: 'self_tour' | 'guided_tour' | 'virtual_tour';
  /** ISO 8601 */
  startedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  /** Staff sessions only: the visitor the admin tours with (the booking's visitor id). */
  tourUserId?: number | null;
}

export interface VisitRecord {
  id: number;
  status: string;
  tourKey: string | null;
  tourType: string | null;
  bookingId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  active: boolean;
  /** When the door access the CMS granted ends (ISO 8601), when the visit is open. */
  accessEndsAt: string | null;
  accessMinutes: number | null;
  verificationRequired: boolean;
  /** False when the same `clientVisitId` had already been answered. */
  created: boolean;
}

// ---- ID verification and the card on file (October 28, 2026) ----

/** `Visitors::Status.id_check` on the server: verified within the validity window, lapsed, never, or flagged by the leasing team. */
export type VerificationState = 'verified' | 'expired' | 'never' | 'mismatch';

/** The document types CheckpointID verifies (the legacy app's list); `back` says whether its back is photographed too. */
export type IdDocumentType = 'drivers_license' | 'id_card' | 'passport' | 'passport_card' | 'international_id';

export interface IdDocumentOption {
  key: IdDocumentType;
  label: string;
  back: boolean;
}

/** `GET /properties/{id}/verification`: what the server requires of this visitor here, and what it knows. */
export interface VerificationStatus {
  propertyId: number;
  /** `check_point_id`; anything else cannot be verified from the app. */
  provider: string;
  /** The server holds the provider's key (without it no attempt can run). */
  providerAvailable: boolean;
  /** The property asks for ID verification at all (`tours.visual_id_verification`). */
  propertyRequires: boolean;
  /** This visitor must verify before check-in (the property asks and no verification is current). */
  required: boolean;
  state: VerificationState;
  verifiedAt: string | null;
  validUntil: string | null;
  verifiedBy: string | null;
  validForDays: number;
  attemptsLeft: number;
  documentTypes: IdDocumentOption[];
  card: {
    /** The property's booking form asks for a card (`tours.credit_card_required`). */
    required: boolean;
    onFile: boolean;
    /** The check-in waits for a card: a verified-ID property that asks for one, and none on file. */
    needed: boolean;
    last4: string | null;
    /** The server can take a card (Stripe is configured). */
    available: boolean;
    /** The Stripe publishable key to tokenize with, only while a card is needed. */
    publishableKey: string | null;
  };
}

export type VerificationOutcome = 'verified' | 'already_verified' | 'face_mismatch' | 'document_unreadable' | 'rejected';

/** `POST /properties/{id}/verification`: the provider's answer as the server read it, and the refreshed status. */
export interface VerificationResult {
  outcome: VerificationOutcome;
  reason: string | null;
  code: string | null;
  status: VerificationStatus;
}

export interface IdVerificationInput {
  documentType: IdDocumentType;
  /** JPEG data URLs straight from the camera; they go to the server once and are never kept. */
  frontImage: string;
  backImage: string | null;
  selfieImage: string;
}

export interface VisitEndInput {
  endedAt: string;
  reason: 'completed' | 'abandoned';
  abandonedAtStop?: string | null;
}

/** `POST /properties/{id}/visits/{visit}/events`: what the CMS kept (duplicates count as kept) and what it refused. */
export interface VisitEventsResult {
  accepted: { index: number; clientEventId: string | null; kind: string; id: number | null; duplicate: boolean }[];
  rejected: { index: number; clientEventId: string | null; code: string; message: string }[];
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
  /** The session in memory (its kind and the server's capabilities), without a request. */
  currentSession(): Session | null;
  /** What the server can do (`GET /health`, no token): visit recording, the visitor sign-in. Cached once read; every sign-in answer refreshes it. */
  getCapabilities(): Promise<Capabilities>;

  // --- the visitor (prospect) sign-in: a phone number and a one-time code
  /** Sends a code to the phone; rejects with `validation_error` for a number that is not one, `rate_limit_exceeded` when throttled. */
  requestVisitorCode(phone: string, countryCode?: string): Promise<VisitorCodeSent>;
  /** Proves the code; rejects with `invalid_code` (wrong / expired / too many tries), `profile_required` (a new visitor: send the name and email too), `validation_error`. */
  verifyVisitorCode(request: VisitorVerifyRequest): Promise<{ session: Session; bookings: VisitorBooking[] }>;
  /** The visitor's bookings the last sign-in or restore answered (memory only). */
  visitorBookings(): VisitorBooking[];
  /** Reads the visitor's bookings again (`GET /visitor/me`), for the resume check (October 25, 2026); a staff session answers the memory copy. */
  refreshVisitorBookings(): Promise<VisitorBooking[]>;
  /** `PUT /visitor/me`: the visitor's own name, email and SMS preference (the phone cannot change here). */
  updateVisitorProfile(patch: VisitorProfilePatch): Promise<Session>;

  // --- property selection
  getProperties(): Promise<PropertyListing[]>;
  selectProperty(propertyId: number): Promise<void>;
  currentPropertyId(): number | null;

  // --- the selected property
  getProperty(): Promise<PropertyBundle>;
  /** The property's current versions (one small request), so the app can tell whether the bundle it holds is still the published one (October 25, 2026). */
  getPropertyVersion(): Promise<{ graphVersion: string | null; configVersion: string | null; publishedAt: string | null }>;
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
  /**
   * A door code for a stop whose smart lock the backend can open (an igloohome API or Iglooworks lock), issued by the
   * property's own vendor account exactly as the legacy Pynwheel Tour app had it. Rejects with the API's reason
   * (`no_lock`, `lock_unsupported`, `locks_disabled`, `lock_unavailable`, `invalid_stop`) or a network error.
   */
  getStopLockPin(node: string, visitId?: number | null): Promise<LockPin>;
  /**
   * The igloohome v1 guest access for a stop whose lock opens over Bluetooth: the guest key (90 minutes) the native
   * igloohome SDK presents to the lock, issued by Pynwheel's partner account exactly as the legacy tour start did.
   * Rejects with the API's reason (`lock_unsupported` for door-code locks, `no_lock`, `lock_unavailable`, …).
   */
  getStopLockBluetoothKey(node: string, visitId?: number | null): Promise<LockBluetoothKey>;
  askConcierge(question: string, context: { stopName: string | null }): Promise<string>;
  // --- booking (the property's Settings › Scheduling rules, the CMS is authoritative)
  getBookingSettings(): Promise<BookingSettings>;
  /** `days` days of slots from `fromDate` (`YYYY-MM-DD`), past times and full types already applied. */
  getAvailability(fromDate: string, days: number): Promise<AvailabilityWindow>;
  /** Books a tour; rejects with the CMS's reason (`slot_unavailable`, `slot_full`, `invalid_visitor`, `tour_type_off`, …). */
  requestBooking(request: BookingRequest): Promise<BookingResult>;
  /** `DELETE /properties/{id}/bookings/{booking}`: the visitor's own booking (staff: any of the property's). Rejects with the CMS's reason. */
  cancelBooking(bookingId: number): Promise<void>;
  startApplication(unitNode: string): Promise<{ id: string }>;

  // --- visits: the tour as the CMS records it (Connect's Visitors reads these)
  /** Check-in. Rejects with `outside_window` (details.booked_at, grace_minutes), `outside_property`, `tour_disabled`, `disabled` (404: the feature is off), `visit_required`. */
  startVisit(input: VisitStartInput): Promise<VisitRecord>;
  /** Up to 100 events in order; a refused request (network, 5xx, 429) rejects as a whole, a refused event is listed in `rejected`. */
  sendVisitEvents(visitId: number, events: VisitEventInput[]): Promise<VisitEventsResult>;
  endVisit(visitId: number, input: VisitEndInput): Promise<VisitRecord>;

  // ---- ID verification and the card on file (October 28, 2026) ----
  /** What the server requires of the signed-in visitor at the current property. */
  getVerificationStatus(): Promise<VerificationStatus>;
  /** One CheckpointID attempt, run by the server; the answer is the server's reading of the provider's, never the app's. */
  submitIdVerification(input: IdVerificationInput): Promise<VerificationResult>;
  /** A Stripe.js card token (never a card number) → the card on file; answers the refreshed status. */
  saveCardOnFile(cardToken: string): Promise<VerificationStatus>;
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
