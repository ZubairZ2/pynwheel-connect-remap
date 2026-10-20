/**
 * The Tour Setup modules' models (Locks, Stops, Visitors, Booking), as the
 * Connect endpoints answer them (`/communities/:id/connect/*`, camelCased by
 * the route handler). Every value is a stored row or a rule the legacy CMS
 * already applies (see the Rails services under app/services/locks, stops,
 * visitors, bookings and scheduling); nothing here is computed in the browser.
 */

/** What every module read and write carries about the signed-in user and property. */
export interface TourModuleMeta {
  writesEnabled: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
  timeZone: string | null;
  propertyName: string | null;
}

export type TourWriteError = 'unauthorized' | 'forbidden' | 'csrf' | 'disabled' | 'missing' | 'stale' | 'invalid' | 'failed';

export interface TourFieldError {
  path?: string;
  code?: string;
  message?: string;
  /** A refused slot carries the day's open slots. */
  slots?: AvailabilitySlot[];
  date?: string;
}

export type TourResult<T> =
  | { ok: true; data: T; meta: TourModuleMeta }
  | { ok: false; error: TourWriteError; message: string | null; errors?: TourFieldError[]; code?: string | null };

/* ── locks ─────────────────────────────────────────────────────────── */

export type LockTargetKind = 'unit' | 'amenity' | 'door' | 'access_point' | 'elevator' | 'building_starting_point' | 'tour';

export interface LockTarget {
  type: string;
  id: number;
  kind: LockTargetKind;
  name: string;
  building: string | null;
  floor: number | null;
  tourStopId: number | null;
  /** A door's unit, amenity, floorplate or site map. */
  parent?: { type: string; id: number; name: string; tourStopId?: number | null } | null;
}

export interface LockHealth {
  state: 'active' | 'inactive' | 'not_reported';
  label: string;
}

export interface LockDeviceRow {
  key: string;
  vendor: string;
  vendorLabel: string;
  id: number;
  deviceId: string;
  name: string;
  mapped: boolean;
  stale: boolean;
  target: LockTarget | null;
  health: LockHealth;
  updatedAt: string | null;
}

/** What the CMS says about a vendor account (Locks::Accounts.describe): never a secret, only whether one is stored. */
export type LockAccountDetails = Record<string, unknown> & {
  id: number;
  instructions: { unit: string | null; amenity: string | null };
  images: { unit: { url: string | null; fileName: string } | null; amenity: { url: string | null; fileName: string } | null };
};

export interface LockProviderAccess {
  method: 'hourly_pin' | 'bluetooth_key' | 'latch_key' | 'mobile_key' | 'remote_unlock' | 'keypad_pin' | string;
  /** Opened by the new Tour App. */
  tourApp: boolean;
  /** Opened by the legacy Pynwheel Tour app. */
  legacyApp: boolean;
  /** v1 only: which igloohome API issues the guest key. */
  source?: 'developer_client' | 'partner_key' | null;
}

export interface LockProvider {
  vendor: string;
  label: string;
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'not_configured' | 'needs_authorization';
  mode: string | null;
  account: Record<string, unknown> | null;
  details: LockAccountDetails | null;
  /** The choices the account form offers (card formats, Igloo versions, ranges), from the CMS. */
  options: Record<string, unknown> | null;
  access: LockProviderAccess | null;
  lockCount: number;
  mappedCount: number;
  lastChangedAt: string | null;
  supports: {
    sync: boolean;
    test: boolean;
    purge: boolean;
    autoMatch: boolean;
    csv: boolean;
    asyncSync: boolean;
    account: boolean;
    instructions: boolean;
    addDevice: boolean;
    removeAuthorization: boolean;
  };
  healthSource: string | null;
  instructions: { unit: string | null; amenity: string | null } | null;
}

export interface LockState {
  provider: string | null;
  device: { vendor: string; id: number; deviceId: string; name: string } | null;
  manualCodePresent: boolean;
  /** Only for users who may edit the property. */
  manualCode: string | null;
  missing: boolean;
}

export interface LockTargetOption {
  target: LockTarget;
  /** The door that holds the lock, when the target is a unit or amenity with one. */
  holder: LockTarget | null;
  lock: LockState;
}

export interface IssuedCode {
  vendor: string;
  vendorLabel: string;
  visitor: { id: number; name: string } | null;
  target: LockTarget | null;
  status: string;
  window: { from: string; to: string } | null;
  issuedAt: string;
}

export interface LockInventory {
  enabled: boolean;
  activeProviders: string[];
  providers: LockProvider[];
  /** Vendors only the Launch onboarding API records (Schlage, Yale, "other"); no account form. */
  launchOnly?: { vendor: string; label: string; present: boolean }[];
  locks: LockDeviceRow[];
  manualCodes: { target: LockTarget; codePresent: boolean; code: string | null }[];
  lockedWithoutLock: { target: LockTarget; provider: string; reason: 'no_device' | 'no_code' }[];
  targets: LockTargetOption[];
  counts: { all: number; unmapped: number; mapped: number; manual: number; health: number; withoutLock: number };
  issued: IssuedCode[];
  /** Set on a write's answer. */
  sync?: { status: string; count: number | null; message: string };
  test?: { vendor: string; status: string; count: number | null; message: string };
  purged?: { vendor: string; count: number };
  applied?: unknown[];
  account?: { vendor: string; created?: boolean; authorizationRemoved?: boolean };
  disconnected?: { vendor: string; count: number };
  device?: { vendor: string; id: number; deviceId: string; name: string };
  imported?: { vendor: string; created: number; skippedExisting: number; skippedBlank: number; rows: number };
}

export interface AutoMatchProposal {
  vendor: string;
  deviceId: string;
  deviceName: string;
  target: LockTarget;
  confidence: string;
}

/* ── stops ─────────────────────────────────────────────────────────── */

export interface StopRowRecord {
  kind: 'unit' | 'amenity' | 'elevator' | 'building_starting_point';
  id: number;
  building: string | null;
  floor: number | null;
  floorplateId: number | null;
  plotted: boolean;
  model: boolean;
  available: boolean | null;
  hasImage: boolean;
  description: string | null;
  instructions: string | null;
  videoLink: string | null;
  virtualTourUrl: string | null;
  amenityType?: string | null;
  showInStopsList?: boolean;
  coveringRange?: string | null;
  elevatorKind?: string;
  status?: string | null;
  door: { id: number; name: string | null } | null;
  editable: string[];
}

export type StopIssue = 'no_pin' | 'no_image' | 'no_instructions' | 'no_lock';

export interface StopRow {
  id: number;
  stopType: string;
  stopId: number;
  sort: number | null;
  visible: boolean;
  durationMinutes: number | null;
  name: string;
  missing: boolean;
  record: StopRowRecord | null;
  holder: LockTarget | null;
  lock: LockState | null;
  issues: StopIssue[];
}

export interface StopRows {
  tour: { id: number; tourSetupVersion: number; buildingOrder: string[] } | null;
  stops: StopRow[];
  issueLabels: Record<string, string>;
  saved?: number;
}

/* ── visitors ──────────────────────────────────────────────────────── */

/**
 * A visitor's row status (Visitors::Status): the design's five plus
 * `abandoned`, a visit the app never ended. The Completed chip counts the
 * abandoned rows too (`counts.completed`), and `counts.abandoned` says how many.
 */
export type VisitorStatus = 'upcoming' | 'in_progress' | 'completed' | 'abandoned' | 'missed' | 'cancelled';
export type VisitorType = 'self' | 'guided' | 'virtual' | 'walkin';

export interface VisitorFlag {
  key: string;
  label: string;
  variant: 'ok' | 'warn' | 'crit' | 'info' | 'neutral';
}

/** `expired`: verified more than 30 days ago (the app asks again). */
export interface VisitorIdCheck {
  state: 'verified' | 'expired' | 'mismatch' | 'never';
  label: string;
  at?: string | null;
  provider?: string | null;
  validUntil?: string | null;
}

export interface VisitorRow {
  id: number;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  removed: boolean;
  whenAt: string;
  status: VisitorStatus;
  statusLabel?: string;
  type: VisitorType;
  typeLabel: string;
  tours: number;
  visits?: number;
  bookings?: number;
  lastVisitAt?: string | null;
  flags: VisitorFlag[];
  idCheck: VisitorIdCheck;
  source: string;
  sms: boolean;
}

export interface OnSiteVisitor {
  id: number;
  name: string;
  initials: string;
  type: VisitorType;
  typeLabel: string;
  startedAt: string;
  elapsedMinutes: number | null;
  lengthy: boolean;
  /** The last stop the app reported, and when: a recorded event, not a live position. */
  lastStop: string | null;
  lastStopAt?: string | null;
  onsite: boolean;
  historyId: number;
}

export interface VisitorsList {
  rows: VisitorRow[];
  counts: Record<string, number>;
  pagination: { page: number; per: number; total: number; pages: number };
  onSite: OnSiteVisitor[];
  comingToday: number;
  timeZone: string;
  now: string;
  stayLimitMinutes: number;
  filters: { status: string; type: string; range: string; q: string };
}

export interface VisitorBooking {
  id: number;
  status: VisitorStatus;
  tourDate: string | null;
  tourTime: string | null;
  bookedAt: string | null;
  propertyTourType: string | null;
  tourType: VisitorType;
  tourTypeLabel: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  customized: boolean;
  stopsList: number[];
  reminders: { dayBefore: boolean; hourBefore: boolean; missed: boolean };
  desiredBedroom: number | null;
  desiredMoveInDate: string | null;
  cancelledAt: string | null;
  cancelledBy?: string | null;
  crm: Record<string, string>;
  /** The slot changes PaperTrail recorded for this booking (Visitors::Changes), oldest first. */
  history?: BookingChange[];
  /** The CRM appointments the integrations wrote on the booking. */
  crmPushes?: { provider: string; label: string; id: string; prospectId?: string | null; name?: string | null }[];
}

export interface BookingSlot {
  tourDate: string | null;
  tourTime: string | null;
  at: string | null;
}

export interface BookingChange {
  from: BookingSlot;
  to: BookingSlot;
  at: string;
  /** The CMS user id when staff moved it; null for the visitor's own widget reschedule. */
  by: string | null;
}

/** One stop the app reported in a session, with everything recorded there. */
export interface SessionStop {
  id: number;
  tourStopId: number | null;
  name: string;
  stopType: string | null;
  /** First recorded event at the stop; the app records arrivals, never departures. */
  at: string | null;
  /** First event at the following stop, when there is one. */
  nextAt?: string | null;
  events?: number;
  /** A door code the app showed at the stop (code-shaped values only). */
  pin: string | null;
  pins?: string[];
  /** A vendor instruction the app showed instead of a code ("Tap the unlock button…"). */
  instruction?: string | null;
  note: string | null;
  notes?: string[];
  photos?: string[];
  imageUrl: string | null;
}

export interface VisitorSession {
  id: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  statusLabel?: string;
  arrived: string | null;
  left: string | null;
  elapsedMinutes: number | null;
  lengthy: boolean;
  lengthyAt?: string | null;
  onsite: boolean;
  tourType: string | null;
  tourStatus: string | null;
  verifiedBy: string | null;
  idMismatch: boolean;
  abandonedAtStop: string | null;
  lockAccessTime: string | null;
  desiredBedroom?: number | null;
  counters?: { availability: number; apply: number; price: number; notes: number; camera: number; pages: number };
  stops: SessionStop[];
  lockEvents: { event: string | null; at: string | null; stopName: string | null; stopType: string | null }[];
  /** `VisitorAccess.id`s issued while this visit was recorded (matched by time). */
  accessIds?: string[];
}

/** A guest access a lock vendor issued to the visitor at this property (Visitors::Access). */
export interface VisitorAccess {
  id: string;
  vendor: string;
  vendorLabel: string;
  method: string;
  methodLabel: string;
  target: LockTarget | null;
  targetName: string | null;
  /** Vendor statuses as stored: Zerv and Latch write  and  (the key is removed after the tour). */
  status: 'issued' | 'active' | 'expired' | 'failed' | 'revoked' | 'inactive' | 'deleted' | string;
  reason: string | null;
  window: { from: string; to: string } | null;
  issuedAt: string;
  codePresent: boolean;
  /** Only when the CMS let this user see codes (`codesVisible`). */
  code: string | null;
}

export interface VisitorProfile {
  visitor: VisitorRow & {
    firstName: string | null;
    lastName: string | null;
    desiredBedroom: number | null;
    selfieUrl: string | null;
    idCardUrl: string | null;
    idMismatch: boolean;
    verificationType: string | null;
    verificationRequired?: boolean;
    verifiedBy?: string | null;
    propertyCode?: { enabled: boolean; status: 'none' | 'active' | 'expired'; code: string | null; generatedAt: string | null; expiresAt: string | null };
    createdAt: string;
  };
  bookings: VisitorBooking[];
  sessions: VisitorSession[];
  access?: VisitorAccess[];
  feedback?: { rating: number | null; comment: string | null; cancelled: boolean; at: string } | null;
  crmPushes?: { provider: string | null; label: string; at: string; status: string | null; bookingId: string | null }[];
  timeline: { at: string; title: string; sub: string | null; kind?: string }[];
  chat: { available: boolean; chatroomId?: number; messages?: { who: string | null; text: string | null; at: string }[] };
  canResetStops: boolean;
  codesVisible?: boolean;
  timeZone: string;
}

/* ── booking settings ──────────────────────────────────────────────── */

export interface BookingGate {
  key: string;
  label: string;
  ok: boolean;
  error: string;
}

export interface HourRange {
  id?: number;
  open: string;
  close: string;
}

export type HoursLane = 'self' | 'guided';

export interface BookingSettings {
  configured: boolean;
  gates: BookingGate[];
  widgetLive: boolean;
  salesforce: boolean;
  crm: { provider: string | null; leadSync: boolean; managedHours: string | null; dataProvider: string | null };
  schedulerEnabled: boolean;
  tourTypes: { selfTour: boolean; guidedTour: boolean; virtualTour: boolean } | null;
  slotInterval: string | null;
  slotIntervalMinutes: number;
  capacity: { enabled: boolean; limitMaxTour: number | null; maxSelfTourUsers: number | null; maxGuidedTourUsers: number | null; maxVirtualTourUsers: number | null } | null;
  onlyScheduledTour: boolean;
  gracePeriod: number | null;
  lengthStayLimit: number | null;
  timeZone: string | null;
  timeZoneEffective: string;
  hours: Record<HoursLane, Record<string, HourRange[]>>;
  /** Buffer, minimum notice and horizon (October 20, 2026 columns); null until the tour exists. */
  window: { bufferMinutes: number; minimumNoticeMinutes: number; bookingHorizonDays: number | null } | null;
  /** Dated closures from yesterday on, soonest first. */
  closures: BookingClosure[];
  /** What the Pynwheel Tour app's Schedule screen shows. */
  app: { afterHoursLabel: boolean; allowShorterTour: boolean; partySizeLimit: number; askUnit: boolean; showTextBooking: boolean } | null;
  /** Settings the CMS cannot store; empty since October 20, 2026. */
  unavailable: string[];
  form: {
    creditCardRequired: boolean;
    idVerificationFee: boolean;
    visualIdVerification: boolean;
    showDesiredBedroom: boolean;
    showDesiredMoveInDate: boolean;
    marketingSourceRequired: boolean;
    marketingSourceAvailable: boolean;
    discoverySource: string | null;
    smsOptInDefault: boolean;
    fixedFields: string[];
  } | null;
  button: { text: string; color: string; textColor: string; icon: string | null; width: number; height: number; font: string; fontSize: string } | null;
  link: { url: string | null; host: string | null; hostSource: 'env' | 'request' | 'none'; hostConfigured: boolean; live: boolean; reasons: string[]; embedHtml: string | null };
}

export interface BookingClosure {
  id: number | null;
  date: string;
  label: string | null;
  closedAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface AvailabilitySlot {
  time: string;
  label: string;
  types: string[];
  full: string[];
}

export interface AvailabilityDay {
  date: string;
  closed: boolean;
  slots: AvailabilitySlot[];
  beyondHorizon?: boolean;
  closure?: BookingClosure | null;
  closures?: BookingClosure[];
}

export interface Availability {
  managedBy: string | null;
  intervalMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingHorizonDays: number | null;
  lastBookableDate: string | null;
  closedWeekdays: number[];
  timeZone: string;
  now: string;
  closures: BookingClosure[];
  days: AvailabilityDay[];
}
