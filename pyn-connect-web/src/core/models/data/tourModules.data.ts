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

export type VisitorStatus = 'upcoming' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
export type VisitorType = 'self' | 'guided' | 'virtual' | 'walkin';

export interface VisitorFlag {
  key: string;
  label: string;
  variant: 'ok' | 'warn' | 'crit' | 'info' | 'neutral';
}

export interface VisitorIdCheck {
  state: 'verified' | 'mismatch' | 'never';
  label: string;
  at?: string | null;
  provider?: string | null;
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
  type: VisitorType;
  typeLabel: string;
  tours: number;
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
  lastStop: string | null;
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
  crm: Record<string, string>;
}

export interface VisitorSession {
  id: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  arrived: string | null;
  left: string | null;
  elapsedMinutes: number | null;
  lengthy: boolean;
  onsite: boolean;
  tourType: string | null;
  tourStatus: string | null;
  verifiedBy: string | null;
  idMismatch: boolean;
  abandonedAtStop: string | null;
  lockAccessTime: string | null;
  stops: { id: number; tourStopId: number | null; name: string; stopType: string | null; at: string | null; pin: string | null; note: string | null; imageUrl: string | null }[];
  lockEvents: { event: string | null; at: string | null; stopName: string | null; stopType: string | null }[];
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
    createdAt: string;
  };
  bookings: VisitorBooking[];
  sessions: VisitorSession[];
  timeline: { at: string; title: string; sub: string | null }[];
  chat: { available: boolean; chatroomId?: number; messages?: { who: string | null; text: string | null; at: string }[] };
  canResetStops: boolean;
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
  button: { text: string; color: string; width: number; height: number; font: string; fontSize: string } | null;
  link: { url: string | null; hostConfigured: boolean; live: boolean; reasons: string[]; embedHtml: string | null };
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
}

export interface Availability {
  managedBy: string | null;
  intervalMinutes: number;
  closedWeekdays: number[];
  timeZone: string;
  now: string;
  days: AvailabilityDay[];
}
