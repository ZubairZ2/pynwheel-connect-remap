import communityPhoto from '~/assets/images/community-pool.jpg';
import { APP_VERSION, AR_INIT_LABELS, BOOKING_TIMES, CONCIERGE_GREETING_GENERAL, CONCIERGE_GREETING_STOP, CONCIERGE_HUMAN_REPLY, CONCIERGE_NOT_CONNECTED, CONCIERGE_PROMPTS, HELP_ITEMS, ONBOARDING_SLIDES, SUPPORT_EMAIL, upcomingDays } from '~/content/appCopy';
import type { LockBluetoothKey, LockPin, MapLevel, Place, PropertyListing, RouteOptions, RouteResult } from '~/models';
import { clearSession, loadSession, NO_CAPABILITIES, parseCapabilities, saveSession, type Capabilities, type Session, type SessionVisitor } from '~/services/session';
import { placesFromBundle } from '../places';
import { FeatureUnavailableError, type AppContent, type AvailabilityWindow, type BookingRequest, type BookingResult, type BookingSettings, type PropertyBundle, type StopDistance, type TourRepository, type TourRouteResult, type VisitEndInput, type VisitEventInput, type VisitEventsResult, type VisitorBooking, type VisitorCodeSent, type VisitorProfilePatch, type VisitorVerifyRequest, type VisitRecord, type VisitStartInput } from '../tourRepository';
import { ApiClient, ApiError } from './apiClient';
import type { ApiAvailabilityResponse, ApiBookingCreateResponse, ApiBookingSettings, ApiDistancesResponse, ApiGraph, ApiHealthResponse, ApiLockBluetoothKeyResponse, ApiLockPinResponse, ApiLoginResponse, ApiMapResponse, ApiPropertyDetail, ApiPropertySummary, ApiRouteResponse, ApiStopsResponse, ApiTourRouteResponse, ApiVisitEventsResponse, ApiVisitorMeResponse, ApiVisitorOtpResponse, ApiVisitorVerifyResponse, ApiVisitStartResponse } from './apiTypes';
import { parseAvailability, parseBookingResult, parseBookingSettings, parseBundle, parseDistances, parseListing, parseLockBluetoothKey, parseLockPin, parseRoute, parseTourRoute, parseVisit, parseVisitEvents, parseVisitor, parseVisitorBookings } from './parsers';

/**
 * The production provider: the Pynwheel Tour App API, served by the Rails CMS
 * (`Api::TourApp::V1`, prefix `/api/tour/v1`) over the real Pynwheel data.
 *
 *   GET  {API}/health                                   (no token: the server's capabilities)
 *   POST {API}/auth/login, /logout, GET /auth/me        (staff: a CMS Super Admin)
 *   POST {API}/visitor/otp, /visitor/otp/verify, /visitor/logout, GET|PUT /visitor/me   (a visitor: a prospect's phone)
 *   GET  {API}/properties, /properties/{id}
 *   GET  {API}/properties/{id}/stops | /map | /map/levels/{id} | /map/levels/{id}/svg | /graph
 *   POST {API}/properties/{id}/route | /tour-route | /stops/distances
 *   POST {API}/properties/{id}/locks/pin | /locks/bluetooth-key
 *   GET  {API}/properties/{id}/booking/settings | /booking/availability
 *   POST {API}/properties/{id}/bookings, DELETE /bookings/{booking}
 *   POST {API}/properties/{id}/visits | /visits/{visit}/events | /visits/{visit}/end
 *
 * The session (token, user, selected property) is persisted by
 * `services/session.ts`; the graph is cached per property with its ETag.
 * Nothing here ever falls back to demo data.
 */

/** The API's path prefix on the Pynwheel CMS host (Rails `Api::TourApp::V1`, October 2026; the former FastAPI service answered under `/api/v1`). */
const API = '/api/tour/v1';

const NO_PROPERTY = 'Choose a property first.';

export class PynwheelApiTourRepository implements TourRepository {
  readonly source = 'pynwheel-api' as const;

  private readonly client: ApiClient;

  private session: Session | null = null;

  private sessionChecked = false;

  private sessionLoading: Promise<void> | null = null;

  private bundleCache: { propertyId: number; bundle: PropertyBundle; graphVersion: string } | null = null;

  /** The bundle load in flight per property, so concurrent callers (the provider loads bundle, content and places together) share one set of requests. */
  private bundleInflight: { propertyId: number; promise: Promise<PropertyBundle> } | null = null;

  private propertiesCache: PropertyListing[] | null = null;

  private propertiesInflight: Promise<PropertyListing[]> | null = null;

  private readonly expiredHandlers = new Set<(message: string) => void>();

  /** The server's capabilities as last answered (`/health` or a sign-in); null until read. */
  private capabilities: Capabilities | null = null;

  private capabilitiesInflight: Promise<Capabilities> | null = null;

  private bookings: VisitorBooking[] = [];

  constructor(options: { baseUrl: string; timeoutMs: number; fetchImpl?: typeof fetch }) {
    this.client = new ApiClient({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      fetchImpl: options.fetchImpl,
      getToken: () => this.session?.accessToken ?? null,
      beforeRequest: () => this.ensureSession(),
      onUnauthorized: (error) => this.expire(error.message)
    });
  }

  /** A fresh instance (a relaunch, or a dev hot update) picks the persisted session up before its first request. */
  private async ensureSession(): Promise<void> {
    if (this.session || this.sessionChecked) return;
    // Concurrent first requests share one read of the store; the second caller must not run ahead with no session.
    if (!this.sessionLoading) {
      this.sessionLoading = loadSession()
        .then((stored) => {
          if (stored && !(stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now())) this.session = stored;
          this.sessionChecked = true;
        })
        .finally(() => {
          this.sessionLoading = null;
        });
    }
    await this.sessionLoading;
  }

  // ------------------------------------------------------------------ session
  async login(email: string, password: string): Promise<Session> {
    const { data } = await this.client.post<ApiLoginResponse>(`${API}/auth/login`, { email: email.trim().toLowerCase(), password }, false);
    if (!data.access_token || !data.user) throw new ApiError('malformed_response', 'The sign-in answer was incomplete. Please try again.', 200);
    const previous = await loadSession();
    this.sessionChecked = true;
    this.capabilities = this.rememberCapabilities(data);
    this.session = { kind: 'staff', accessToken: data.access_token, expiresAt: data.expires_at ?? null, user: data.user, visitor: null, propertyId: previous?.kind === 'staff' && previous.user.id === data.user.id ? previous.propertyId : null, capabilities: this.capabilities };
    this.propertiesCache = null;
    this.bookings = [];
    await saveSession(this.session);
    return this.session;
  }

  async logout(): Promise<void> {
    const token = this.session?.accessToken;
    const path = this.session?.kind === 'visitor' ? `${API}/visitor/logout` : `${API}/auth/logout`;
    this.session = null;
    this.bundleCache = null;
    this.propertiesCache = null;
    this.bookings = [];
    await clearSession();
    if (token) {
      try {
        await this.client.request('POST', path, undefined, { Authorization: `Bearer ${token}` }, false);
      } catch {
        /* the token is dropped locally either way; it expires server-side */
      }
    }
  }

  async restoreSession(): Promise<Session | null> {
    const stored = await loadSession();
    if (!stored) return null;
    if (stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now()) {
      await clearSession();
      return null;
    }
    this.session = stored;
    this.sessionChecked = true;
    try {
      if (stored.kind === 'visitor') {
        const { data } = await this.client.get<ApiVisitorMeResponse>(`${API}/visitor/me`);
        // The server's copy of the profile wins over the stored one (it may have been edited elsewhere).
        const visitor = parseVisitor(data.visitor);
        this.capabilities = this.rememberCapabilities(data);
        this.bookings = parseVisitorBookings(data.bookings);
        this.session = { ...stored, expiresAt: data.expires_at ?? stored.expiresAt, visitor, user: visitorUser(visitor), capabilities: this.capabilities };
        await saveSession(this.session);
      } else {
        const { data } = await this.client.get<{ capabilities?: unknown }>(`${API}/auth/me`);
        this.capabilities = this.rememberCapabilities(data);
        if (data?.capabilities) this.session = { ...this.session, capabilities: this.capabilities };
      }
    } catch (error) {
      if (error instanceof ApiError && (error.isAuth || error.status === 403)) {
        this.session = null;
        await clearSession();
        return null;
      }
      // Offline: keep the session; requests will fail with a network error the UI shows.
    }
    return this.session;
  }

  currentSession(): Session | null {
    return this.session;
  }

  private rememberCapabilities(body: { capabilities?: unknown } | null | undefined): Capabilities {
    const caps = body && typeof body === 'object' && body.capabilities ? parseCapabilities(body.capabilities) : (this.capabilities ?? NO_CAPABILITIES);
    this.capabilities = caps;
    return caps;
  }

  async getCapabilities(): Promise<Capabilities> {
    if (this.capabilities) return this.capabilities;
    if (this.capabilitiesInflight) return this.capabilitiesInflight;
    const promise = this.client
      .request<ApiHealthResponse>('GET', `${API}/health`, undefined, {}, false)
      .then(({ data }) => this.rememberCapabilities(data))
      .finally(() => {
        if (this.capabilitiesInflight === promise) this.capabilitiesInflight = null;
      });
    this.capabilitiesInflight = promise;
    return promise;
  }

  // ------------------------------------------------- the visitor sign-in
  async requestVisitorCode(phone: string, countryCode = 'US'): Promise<VisitorCodeSent> {
    const { data } = await this.client.post<ApiVisitorOtpResponse>(`${API}/visitor/otp`, { phone: phone.trim(), country_code: countryCode, ...(this.currentPropertyId() != null ? { property_id: this.currentPropertyId() } : {}) }, false);
    return { resendAfterS: typeof data?.resend_after === 'number' ? data.resend_after : 60, debugCode: typeof data?.debug_code === 'string' && /^\d{4,8}$/.test(data.debug_code) ? data.debug_code : null };
  }

  async verifyVisitorCode(request: VisitorVerifyRequest): Promise<{ session: Session; bookings: VisitorBooking[] }> {
    const { data } = await this.client.post<ApiVisitorVerifyResponse>(
      `${API}/visitor/otp/verify`,
      {
        phone: request.phone.trim(),
        code: request.code.trim(),
        country_code: request.countryCode ?? 'US',
        ...(request.firstName ? { first_name: request.firstName.trim() } : {}),
        ...(request.lastName ? { last_name: request.lastName.trim() } : {}),
        ...(request.email ? { email: request.email.trim() } : {}),
        ...(request.propertyId != null ? { property_id: request.propertyId } : {})
      },
      false
    );
    if (!data.access_token || !data.visitor) throw new ApiError('malformed_response', 'The sign-in answer was incomplete. Please try again.', 200);
    const visitor = parseVisitor(data.visitor);
    const previous = await loadSession();
    this.sessionChecked = true;
    this.capabilities = this.rememberCapabilities(data);
    this.bookings = parseVisitorBookings(data.bookings);
    // The property: the one this phone used last as this visitor, else the one the visitor's next booking is at.
    const remembered = previous?.kind === 'visitor' && previous.user.id === visitor.id ? previous.propertyId : null;
    const next = this.bookings.find((b) => b.status === 'upcoming') ?? null;
    this.session = { kind: 'visitor', accessToken: data.access_token, expiresAt: data.expires_at ?? null, user: visitorUser(visitor), visitor, propertyId: remembered ?? request.propertyId ?? next?.propertyId ?? null, capabilities: this.capabilities };
    this.propertiesCache = null;
    this.bundleCache = null;
    await saveSession(this.session);
    return { session: this.session, bookings: this.bookings };
  }

  visitorBookings(): VisitorBooking[] {
    return this.bookings;
  }

  async refreshVisitorBookings(): Promise<VisitorBooking[]> {
    await this.ensureSession();
    if (this.session?.kind !== 'visitor') return this.bookings;
    const { data } = await this.client.get<ApiVisitorMeResponse>(`${API}/visitor/me`);
    this.bookings = parseVisitorBookings(data.bookings);
    this.capabilities = this.rememberCapabilities(data);
    return this.bookings;
  }

  async updateVisitorProfile(patch: VisitorProfilePatch): Promise<Session> {
    await this.ensureSession();
    if (!this.session || this.session.kind !== 'visitor') throw new ApiError('visitor_only', 'Sign in with your phone to edit this profile.', 403);
    const { data } = await this.client.put<{ visitor: ApiVisitorMeResponse['visitor'] }>(`${API}/visitor/me`, {
      ...(patch.firstName !== undefined ? { first_name: patch.firstName.trim() } : {}),
      ...(patch.lastName !== undefined ? { last_name: patch.lastName.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
      ...(patch.smsEnabled !== undefined ? { is_sms_enabled: patch.smsEnabled } : {})
    });
    const visitor = parseVisitor(data.visitor);
    this.session = { ...this.session, visitor, user: visitorUser(visitor) };
    await saveSession(this.session);
    return this.session;
  }

  onSessionExpired(handler: (message: string) => void): () => void {
    this.expiredHandlers.add(handler);
    return () => this.expiredHandlers.delete(handler);
  }

  private expire(message: string): void {
    if (!this.session) return;
    this.session = null;
    this.bundleCache = null;
    void clearSession();
    this.expiredHandlers.forEach((h) => h(message));
  }

  // ---------------------------------------------------------- property choice
  async getProperties(): Promise<PropertyListing[]> {
    // One request however many callers ask at once (the provider's list load and `getContent` start together).
    if (this.propertiesInflight) return this.propertiesInflight;
    const promise = this.client
      .get<{ properties: ApiPropertySummary[] }>(`${API}/properties`)
      .then(({ data }) => {
        const current = this.currentPropertyId();
        this.propertiesCache = (Array.isArray(data.properties) ? data.properties : []).map((p) => parseListing(p, current));
        return this.propertiesCache;
      })
      .finally(() => {
        if (this.propertiesInflight === promise) this.propertiesInflight = null;
      });
    this.propertiesInflight = promise;
    return promise;
  }

  async selectProperty(propertyId: number): Promise<void> {
    await this.ensureSession();
    if (!this.session) throw new ApiError('unauthorized', 'Sign in to continue.', 401);
    if (this.session.propertyId !== propertyId) this.bundleCache = null;
    this.session = { ...this.session, propertyId };
    await saveSession(this.session);
  }

  currentPropertyId(): number | null {
    return this.session?.propertyId ?? null;
  }

  private async requireProperty(): Promise<number> {
    await this.ensureSession();
    const id = this.currentPropertyId();
    if (id == null) throw new ApiError('no_property', NO_PROPERTY, 0);
    return id;
  }

  // ----------------------------------------------------------- the property
  async getPropertyVersion(): Promise<{ graphVersion: string | null; configVersion: string | null; publishedAt: string | null }> {
    const id = await this.requireProperty();
    const { data } = await this.client.get<ApiPropertyDetail>(`${API}/properties/${id}`);
    const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
    return { graphVersion: text(data.graph_version), configVersion: text(data.config_version), publishedAt: text(data.published_at) };
  }

  async getProperty(): Promise<PropertyBundle> {
    const id = await this.requireProperty();
    if (this.bundleInflight?.propertyId === id) return this.bundleInflight.promise;
    const promise = this.loadBundle(id).finally(() => {
      if (this.bundleInflight?.promise === promise) this.bundleInflight = null;
    });
    this.bundleInflight = { propertyId: id, promise };
    return promise;
  }

  private async loadBundle(id: number): Promise<PropertyBundle> {
    const headers = this.bundleCache?.propertyId === id ? { 'If-None-Match': `"${this.bundleCache.graphVersion}"` } : undefined;
    const [detail, graph, stops, map] = await Promise.all([
      this.client.get<ApiPropertyDetail>(`${API}/properties/${id}`),
      this.client.get<ApiGraph>(`${API}/properties/${id}/graph`, headers),
      this.client.get<ApiStopsResponse>(`${API}/properties/${id}/stops`),
      this.client.get<ApiMapResponse>(`${API}/properties/${id}/map`)
    ]);
    if (graph.status === 304 && this.bundleCache?.propertyId === id && stops.data.graph_version === this.bundleCache.graphVersion) {
      return this.bundleCache.bundle;
    }
    const graphData = graph.status === 304 ? null : graph.data;
    if (!graphData) {
      // The server says our graph is current but we have no copy (should not happen): fetch it plainly.
      const fresh = await this.client.get<ApiGraph>(`${API}/properties/${id}/graph`);
      return this.remember(id, parseBundle(detail.data, fresh.data, stops.data, communityPhoto, map.data), fresh.data.version);
    }
    return this.remember(id, parseBundle(detail.data, graphData, stops.data, communityPhoto, map.data), graphData.version);
  }

  private remember(propertyId: number, bundle: PropertyBundle, graphVersion: string): PropertyBundle {
    this.bundleCache = { propertyId, bundle, graphVersion };
    return bundle;
  }

  async getContent(): Promise<AppContent> {
    const user = this.session?.user;
    const name = user?.name?.trim() || user?.email || 'there';
    const first = name.split(/\s+/)[0] ?? name;
    const nearby = this.propertiesCache ?? (await this.getProperties().catch(() => [] as PropertyListing[]));
    return {
      visitor: { name, initials: name.charAt(0).toUpperCase(), email: user?.email ?? '', phone: '' },
      firstName: first,
      nearbyProperties: nearby,
      hiRiseListings: [],
      tourHistory: [],
      onboarding: ONBOARDING_SLIDES,
      arInitLabels: AR_INIT_LABELS,
      help: HELP_ITEMS,
      supportEmail: SUPPORT_EMAIL,
      concierge: { answers: [], fallback: CONCIERGE_NOT_CONNECTED, greetingStop: CONCIERGE_GREETING_STOP, greetingGeneral: CONCIERGE_GREETING_GENERAL, humanReply: CONCIERGE_HUMAN_REPLY, prompts: CONCIERGE_PROMPTS },
      booking: { days: upcomingDays(), times: BOOKING_TIMES },
      bestMatch: { reasons: [], percent: 0 },
      appVersion: APP_VERSION
    };
  }

  async getPlaces(): Promise<Place[]> {
    const bundle = this.bundleCache?.propertyId === this.currentPropertyId() ? this.bundleCache.bundle : await this.getProperty();
    return placesFromBundle(bundle);
  }

  async getLevelSvg(level: MapLevel): Promise<Blob> {
    if (!level.svgPath) throw new FeatureUnavailableError('A floor SVG for this level');
    return this.client.blob(level.svgPath);
  }

  // ------------------------------------------------------------------ routes
  async findRoute(from: string, to: string, options: RouteOptions = {}): Promise<RouteResult> {
    const id = await this.requireProperty();
    try {
      const { data } = await this.client.post<ApiRouteResponse>(`${API}/properties/${id}/route`, { from_stop_id: from, to_stop_id: to, from_floor: options.fromFloor ?? null, to_floor: options.toFloor ?? null, step_free: options.stepFree === true, avoid_blockers: options.avoidBlockers !== false });
      return { ok: true, route: parseRoute(data.route) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.code !== 'validation_error' && error.code !== 'tour_disabled') {
        return { ok: false, from, to, error: { code: error.code as RouteResult extends { ok: false; error: { code: infer C } } ? C : never, message: error.message }, warnings: [] };
      }
      throw error;
    }
  }

  async getTourRoute(stopNodes: string[] | null, options: RouteOptions = {}): Promise<TourRouteResult> {
    const id = await this.requireProperty();
    let nodes = stopNodes;
    if (!nodes) {
      const bundle = this.bundleCache?.propertyId === id ? this.bundleCache.bundle : await this.getProperty();
      nodes = [...bundle.amenities.map((a) => a.node), ...bundle.units.map((u) => u.node)];
    }
    try {
      const { data } = await this.client.post<ApiTourRouteResponse>(`${API}/properties/${id}/tour-route`, {
        stop_ids: nodes,
        step_free: options.stepFree === true,
        avoid_blockers: options.avoidBlockers !== false,
        ...(options.startId ? { start_stop_id: options.startId } : {})
      });
      return { ok: true, tour: parseTourRoute(data) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.code !== 'validation_error' && error.code !== 'tour_disabled') {
        return { ok: false, from: null, to: null, error: { code: (error.code === 'invalid_stop' ? 'unknown_endpoint' : error.code) as 'no_path', message: error.message }, warnings: [] };
      }
      throw error;
    }
  }

  async getStopDistances(nodes: string[]): Promise<Record<string, StopDistance>> {
    if (!nodes.length) return {};
    const id = await this.requireProperty();
    const { data } = await this.client.post<ApiDistancesResponse>(`${API}/properties/${id}/stops/distances`, { stop_ids: nodes });
    return parseDistances(data);
  }

  // ------------------------------------------------------------- smart locks
  async getStopLockPin(node: string, visitId: number | null = null): Promise<LockPin> {
    const id = await this.requireProperty();
    const { data } = await this.client.post<ApiLockPinResponse>(`${API}/properties/${id}/locks/pin`, { stop_id: node, ...(visitId != null ? { visit_id: visitId } : {}) });
    if (typeof data.pin !== 'string' || !data.pin) throw new ApiError('malformed_response', 'The lock service answered without a door code. Please try again.', 200);
    return parseLockPin(data);
  }

  async getStopLockBluetoothKey(node: string, visitId: number | null = null): Promise<LockBluetoothKey> {
    const id = await this.requireProperty();
    const { data } = await this.client.post<ApiLockBluetoothKeyResponse>(`${API}/properties/${id}/locks/bluetooth-key`, { stop_id: node, ...(visitId != null ? { visit_id: visitId } : {}) });
    if (typeof data.bluetooth_key !== 'string' || !data.bluetooth_key) throw new ApiError('malformed_response', 'The lock service answered without a Bluetooth key. Please try again.', 200);
    return parseLockBluetoothKey(data);
  }

  // --------------------------------------------- features without a backend
  async askConcierge(_question: string, context: { stopName: string | null }): Promise<string> {
    const property = this.bundleCache?.bundle.property.name ?? 'this property';
    return CONCIERGE_NOT_CONNECTED.replace('{property}', property).replace('{stop}', context.stopName ?? 'this stop');
  }

  // ---------------------------------------------------------------- booking
  async getBookingSettings(): Promise<BookingSettings> {
    const id = await this.requireProperty();
    const { data } = await this.client.get<ApiBookingSettings>(`${API}/properties/${id}/booking/settings`);
    return parseBookingSettings(data);
  }

  async getAvailability(fromDate: string, days: number): Promise<AvailabilityWindow> {
    const id = await this.requireProperty();
    const query = new URLSearchParams({ date: fromDate, days: String(Math.min(31, Math.max(1, Math.round(days)))) });
    const { data } = await this.client.get<ApiAvailabilityResponse>(`${API}/properties/${id}/booking/availability?${query.toString()}`);
    return parseAvailability(data);
  }

  async requestBooking(request: BookingRequest): Promise<BookingResult> {
    const id = await this.requireProperty();
    // A visitor books as themselves: the CMS ignores identity fields for a `vst_` token, so none are sent.
    const identity = this.session?.kind === 'visitor' ? {} : { first_name: request.firstName, last_name: request.lastName, email: request.email, phone_number: request.phone, ...(request.countryCode ? { country_code: request.countryCode } : {}) };
    const { data } = await this.client.post<ApiBookingCreateResponse>(`${API}/properties/${id}/bookings`, {
      tour_type: request.tourType,
      property_tour_type: 'scheduled_tour',
      tour_date: request.date,
      tour_time: request.time,
      ...identity,
      ...(request.desiredUnit ? { unit: request.desiredUnit } : {}),
      ...(request.lengthMinutes ? { length_minutes: request.lengthMinutes } : {}),
      ...(request.partySize ? { party_size: request.partySize } : {}),
      ...(request.desiredBedroom ? { desired_bedroom: request.desiredBedroom } : {}),
      ...(request.desiredMoveInDate ? { desired_move_in_date: request.desiredMoveInDate } : {})
    });
    return parseBookingResult(data);
  }

  async cancelBooking(bookingId: number): Promise<void> {
    const id = await this.requireProperty();
    await this.client.delete(`${API}/properties/${id}/bookings/${bookingId}`);
  }

  async startApplication(_unitNode: string): Promise<{ id: string }> {
    throw new FeatureUnavailableError('Online applications');
  }

  // ----------------------------------------------------------------- visits
  async startVisit(input: VisitStartInput): Promise<VisitRecord> {
    const id = await this.requireProperty();
    const { data } = await this.client.post<ApiVisitStartResponse>(`${API}/properties/${id}/visits`, {
      client_visit_id: input.clientVisitId,
      ...(input.bookingId != null ? { booking_id: input.bookingId } : {}),
      tour_type: input.tourType,
      started_at: input.startedAt,
      ...(input.latitude != null && input.longitude != null ? { latitude: input.latitude, longitude: input.longitude } : {}),
      device_time_zone: deviceTimeZone(),
      app_version: APP_VERSION,
      ...(input.tourUserId != null ? { tour_user_id: input.tourUserId } : {})
    });
    return parseVisit(data.visit);
  }

  async sendVisitEvents(visitId: number, events: VisitEventInput[]): Promise<VisitEventsResult> {
    const id = await this.requireProperty();
    const { data } = await this.client.post<ApiVisitEventsResponse>(`${API}/properties/${id}/visits/${visitId}/events`, {
      events: events.slice(0, 100).map((e) => ({ client_event_id: e.clientEventId, kind: e.kind, ...(e.stopId ? { stop_id: e.stopId } : {}), occurred_at: e.occurredAt, ...(e.payload ? { payload: e.payload } : {}) }))
    });
    return parseVisitEvents(data);
  }

  async endVisit(visitId: number, input: VisitEndInput): Promise<VisitRecord> {
    const id = await this.requireProperty();
    const { data } = await this.client.post<{ visit: ApiVisitStartResponse['visit'] }>(`${API}/properties/${id}/visits/${visitId}/end`, { ended_at: input.endedAt, reason: input.reason, ...(input.abandonedAtStop ? { abandoned_at_stop: input.abandonedAtStop } : {}) });
    return parseVisit(data.visit);
  }
}

/** The principal summary of a visitor session: the app's `user` for a prospect. */
const visitorUser = (visitor: SessionVisitor) => ({ id: visitor.id, name: visitor.name, firstName: visitor.firstName, lastName: visitor.lastName, email: visitor.email, role: 'visitor', phone: visitor.phone });

const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
