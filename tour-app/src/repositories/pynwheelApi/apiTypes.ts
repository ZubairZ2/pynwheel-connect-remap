/** The Tour App API's JSON (snake_case), as the Rails `Api::TourApp::V1` controllers (app/services/tour_api/) serve it. Parsed into `~/models` by `parsers.ts`. */

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ApiLoginResponse {
  success: true;
  access_token: string;
  token_type: string;
  expires_at: string | null;
  user: ApiUser;
  /** Since October 23, 2026: the optional server features, so the app can gate its UI right after sign-in. */
  capabilities?: ApiCapabilities;
}

export interface ApiPropertySummary {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  company: string | null;
  tour_enabled: boolean;
  is_sitemap: boolean;
}

export interface ApiPropertyDetail extends ApiPropertySummary {
  auto_wayfinding: boolean;
  floorplates_count: number;
  units_count: number;
  amenities_count: number;
  buildings: string[];
  tour: { id: number; start_node: string | null; starting_floor: number | null; building: string | null; building_order: string[]; stops_total: number } | null;
  graph_version: string | null;
  config_version?: string | null;
  published_at?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ApiLevel {
  id: string;
  kind: 'floorplate' | 'sitemap';
  name: string | null;
  building: string | null;
  floors: number[];
  image: string | null;
  svg: string | null;
  width: number | null;
  height: number | null;
  space: string;
  scale_ft_per_px: number | null;
  version: number | null;
  svg_path?: string | null;
  svg_transform?: { a: number; b: number; c: number; d: number; e: number; f: number } | null;
  svg_size?: { width: number | null; height: number | null } | null;
}

export interface ApiMapResponse {
  success: true;
  property_id: number;
  graph_version: string;
  is_sitemap: boolean;
  auto_wayfinding: boolean;
  buildings: { name: string; level_ids: string[] }[];
  levels: ApiLevel[];
}

export interface ApiNode {
  id: string;
  kind: string;
  level: string;
  floor: number | null;
  building: string | null;
  name: string | null;
  x: number;
  y: number;
  anchor: 'icon_top_left' | 'door' | 'point';
  review?: string | null;
  attach?: string | null;
  link?: string | null;
  lock_provider?: string | null;
  note?: string | null;
  vertical?: string | null;
  accessible?: boolean | null;
  floors_served?: number[] | null;
  positions?: Record<string, { x: number; y: number }> | null;
  radius_px?: number | null;
}

export interface ApiEdge {
  from: string;
  to: string;
  kind: 'walk';
  path_kind: string;
  level: string;
  length_px: number;
  polyline: [number, number][];
}

export interface ApiGraph {
  success: true;
  version: string;
  community_id: number;
  is_sitemap: boolean;
  auto_wayfinding: boolean;
  scale: { unit: 'px'; ft_per_px: number | null };
  levels: ApiLevel[];
  buildings: string[];
  nodes: ApiNode[];
  edges: ApiEdge[];
  vertical_connections: { id: string; kind: string; floors: number[]; accessible: boolean | null; levels: string[] }[];
  gates: { id: string; building: string | null; kind: string }[];
  tour: { id: number; start: string | null; starting_floor: number | null; building: string | null; building_order: string[]; version: number | null; stops: { tour_stop_id: number; node: string | null; stop_type: string | null; name: string | null; sort: number | null; visible: boolean; duration_minutes: number | null; on_map: boolean }[] } | null;
}

/** The smart lock a stop carries (`TourApi::Locks#describe`): the vendor, the igloohome account mode, how it opens, the mapped device, and whether this API can issue a door code for it. */
export interface ApiStopLock {
  provider: string;
  mode: 'v1' | 'igloohome' | 'iglooworks' | string | null;
  method: 'pin' | 'bluetooth' | null;
  device_id: string | null;
  supported: boolean;
}

export interface ApiStop {
  id: string;
  type: 'unit' | 'amenity';
  record_id: number;
  tour_stop_id: number;
  name: string;
  description: string | null;
  instruction: string | null;
  building: string | null;
  floor: number | null;
  level_id: string | null;
  floorplate_id: number | null;
  location: { x: number; y: number } | null;
  map_node_id: string | null;
  routable: boolean;
  sort: number | null;
  duration_minutes: number | null;
  unit: {
    bedrooms: number | null;
    bathrooms: number | null;
    square_feet: number | null;
    rent: number | null;
    available: boolean | null;
    model: boolean;
    floorplan_name: string | null;
    unit_type?: string | null;
    available_date?: string | null;
    availability?: string | null;
    lease_terms?: { months: number; rent: number }[] | null;
    deposit?: number | null;
    additional_fee?: string | null;
    virtual_tour_url?: string | null;
  } | null;
  amenity: { amenity_type: string | null; video_url: string | null; video_button_label: string | null } | null;
  lock?: ApiStopLock | null;
  /** The CMS-managed media (October 21, 2026): the main image, the floor plan image, the gallery photos, the virtual-tour link. */
  media?: { image: string | null; floorplan_image: string | null; photos: { id: number; name: string | null; url: string }[]; virtual_tour_url: string | null } | null;
}

/** `POST /properties/{id}/locks/pin`: an hourly igloohome door code for one stop (`TourApi::Locks#pin!`). */
export interface ApiLockPinResponse {
  success: true;
  stop_id: string;
  provider: string;
  mode: string | null;
  device_id: string | null;
  access_name: string;
  pin: string;
  valid_from: string | null;
  valid_until: string | null;
}

/** `POST /properties/{id}/locks/bluetooth-key`: the igloohome v1 guest access (`TourApi::Locks#bluetooth_key!`): the Bluetooth guest key for 90 minutes and the backup PIN. */
export interface ApiLockBluetoothKeyResponse {
  success: true;
  stop_id: string;
  provider: string;
  mode: 'v1';
  device_id: string | null;
  /** The lock's Bluetooth name the scan must match (the CMS device id). */
  lock_name: string;
  bluetooth_key: string;
  key_id: string | null;
  guest_pin: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface ApiStopsResponse {
  success: true;
  property_id: number;
  graph_version: string;
  tour_id: number | null;
  start_node: string | null;
  groups: { key: 'amenities' | 'floorplans'; label: string; stops: ApiStop[] }[];
  total: number;
}

export interface ApiPlaceRef {
  id: string;
  type: string | null;
  name: string | null;
}

export interface ApiRouteStep {
  sequence: number;
  type: 'walk' | 'elevator' | 'stairs' | 'ramp' | 'outdoor' | 'arrive';
  title: string;
  description: string;
  instruction: string | null;
  distance: number;
  unit: 'px';
  distance_ft: number | null;
  floor: { level_id: string | null; number: number | null; name: string } | null;
  from: ApiPlaceRef | null;
  to: ApiPlaceRef | null;
  leg: number;
  geometry: [number, number][];
  transition: { kind: string; via: string | null; name: string | null; floor_from: number | null; floor_to: number | null; from_level_id: string | null; to_level_id: string | null } | null;
  dwell_s?: number | null;
}

export type ApiLeg =
  | { index: number; kind: 'walk'; level: string | null; floor: number | null; building: string | null; from: string; to: string; length_px: number; points: [number, number][]; nodes: string[] }
  | { index: number; kind: 'elevator' | 'stairs' | 'ramp' | 'outdoor'; via: string | null; name: string | null; floor_from: number | null; floor_to: number | null; from: string; to: string; length_px: number };

export interface ApiRoute {
  start: ApiPlaceRef;
  destination: ApiPlaceRef;
  step_free: boolean;
  avoid_blockers: boolean;
  total_distance: number;
  unit: 'px';
  total_distance_ft: number | null;
  duration_s: number | null;
  floors: { level_id: string | null; number: number | null; name: string }[];
  buildings: string[];
  stages: { level_id: string; floor: number | null; building: string | null; leg: number }[];
  legs: ApiLeg[];
  steps: ApiRouteStep[];
  warnings: string[];
}

export interface ApiRouteResponse {
  success: true;
  graph_version: string;
  route: ApiRoute;
}

export interface ApiTourRouteResponse {
  success: true;
  graph_version: string;
  route: ApiRoute;
  segments: { stop_id: string; tour_stop_id: number | null; from_stop_id: string; route: ApiRoute }[];
  skipped: string[];
}

export interface ApiDistancesResponse {
  success: true;
  graph_version: string;
  from_stop_id: string | null;
  distances: Record<string, { reachable: boolean; distance: number; unit: 'px'; distance_ft: number | null; duration_s: number | null; direction: 'up' | 'down' | 'level'; error: { code: string; message: string } | null }>;
}

// ---- booking (Api::TourApp::V1::BookingsController, October 20, 2026) ----
export interface ApiBookingSettings {
  property_id: number;
  time_zone: string;
  scheduler_enabled: boolean;
  widget_live: boolean;
  salesforce: boolean;
  bookable: boolean;
  managed_by: string | null;
  gates: { key: string; label: string; ok: boolean; error: string }[];
  tour_types: { self_tour: boolean; guided_tour: boolean } | null;
  slot_interval_minutes: number;
  only_scheduled_tour: boolean;
  grace_period: number | null;
  length_stay_limit: number | null;
  capacity: { enabled: boolean; max_self_tour_users: number | null; max_guided_tour_users: number | null } | null;
  window: { buffer_minutes: number; minimum_notice_minutes: number; booking_horizon_days: number | null } | null;
  closures: { id: number; date: string; label: string | null; closed_all_day: boolean; start_time: string | null; end_time: string | null }[];
  app: { after_hours_label: boolean; allow_shorter_tour: boolean; party_size_limit: number; ask_unit: boolean; show_text_booking: boolean } | null;
  hours: Record<string, Record<string, { open: string; close: string }[]>>;
  form: { credit_card_required: boolean; show_desired_bedroom: boolean; show_desired_move_in_date: boolean } | null;
  link: { url: string | null; live: boolean } | null;
}

export interface ApiAvailabilitySlot {
  time: string;
  label: string;
  types: string[];
  full: string[];
}

export interface ApiAvailabilityDay {
  date: string;
  closed: boolean;
  beyond_horizon?: boolean;
  closure?: { label: string | null } | null;
  slots: ApiAvailabilitySlot[];
}

export interface ApiAvailabilityResponse {
  time_zone: string;
  now: string;
  interval_minutes: number;
  last_bookable_date: string | null;
  days: ApiAvailabilityDay[];
}

export interface ApiBookingCreateResponse {
  booking: { id: number; status: string; tour_date: string | null; tour_time: string | null; tour_time_label: string | null; end_time: string | null; booked_at?: string | null; time_zone?: string | null; tour_type: string; property_tour_type: string; created_by: string; rescheduled: boolean };
  visitor: { id: number; first_name: string; last_name: string; email: string; phone_number: string };
  notifications: { email: boolean; sms: boolean; web: boolean };
}

// ---- the visitor sign-in, visits and capabilities (October 23, 2026) ----
export interface ApiCapabilities {
  visits: boolean;
  visitor_auth: boolean;
  location_required?: boolean;
  presence?: boolean;
}

export interface ApiHealthResponse {
  success: true;
  status: string;
  database: boolean;
  env: string;
  capabilities: ApiCapabilities;
}

export interface ApiVisitor {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  phone_masked: string | null;
  is_sms_enabled: boolean;
  role: 'visitor';
}

export interface ApiVisitorBooking {
  id: number;
  property_id: number;
  property_name?: string | null;
  status: string;
  tour_date: string | null;
  tour_time: string | null;
  tour_time_label: string | null;
  end_time: string | null;
  booked_at?: string | null;
  time_zone?: string | null;
  tour_type: string | null;
  property_tour_type: string | null;
  created_by: string | null;
  is_tour_completed: boolean;
  desired_bedroom: string | null;
  desired_move_in_date: string | null;
}

export interface ApiVisitorOtpResponse {
  success: true;
  sent: boolean;
  resend_after: number;
  /** Testing only: the server returns the code when PYN_TOUR_OTP_DEBUG is on (never in production). */
  debug_code?: string;
}

export interface ApiVisitorVerifyResponse {
  success: true;
  access_token: string;
  token_type: string;
  expires_at: string | null;
  visitor: ApiVisitor;
  bookings: ApiVisitorBooking[];
  capabilities: ApiCapabilities;
}

export interface ApiVisit {
  id: number;
  status: string;
  tour_key: string | null;
  tour_type: string | null;
  tour_site: string | null;
  booking_id: number | null;
  source: string | null;
  started_at: string | null;
  ended_at?: string | null;
  ended_reason?: string | null;
  active: boolean;
  access_window: { starts_at: string | null; ends_at: string | null; minutes: number | null } | null;
  within_radius?: boolean | null;
  in_hours?: boolean | null;
  location_received?: boolean;
  proximity?: string | null;
  distance_m?: number | null;
  accuracy_m?: number | null;
  fix_at?: string | null;
  presence?: { state: string; fix_at?: string | null; distance_m?: number | null; departed_at?: string | null; returned_at?: string | null } | null;
  verification_required?: boolean;
  created?: boolean;
  server_time?: string | null;
  property_id?: number;
  property_name?: string;
}

export interface ApiVisitorMeResponse {
  success: true;
  visitor: ApiVisitor;
  expires_at: string | null;
  bookings: ApiVisitorBooking[];
  open_visit: ApiVisit | null;
  capabilities: ApiCapabilities;
}

export interface ApiVisitStartResponse {
  success: true;
  visit: ApiVisit;
  booking: ApiVisitorBooking | null;
}

export interface ApiVisitEventsResponse {
  success: true;
  visit_id: number;
  accepted: { index: number; client_event_id: string | null; kind: string; id: number | null; duplicate: boolean }[];
  rejected: { index: number; client_event_id: string | null; code: string; message: string }[];
}
