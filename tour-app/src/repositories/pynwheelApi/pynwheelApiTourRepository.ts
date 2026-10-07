import communityPhoto from '~/assets/images/community-pool.jpg';
import { APP_VERSION, AR_INIT_LABELS, BOOKING_TIMES, CONCIERGE_GREETING_GENERAL, CONCIERGE_GREETING_STOP, CONCIERGE_HUMAN_REPLY, CONCIERGE_NOT_CONNECTED, CONCIERGE_PROMPTS, HELP_ITEMS, ONBOARDING_SLIDES, SUPPORT_EMAIL, upcomingDays } from '~/content/appCopy';
import type { MapLevel, Place, PropertyListing, RouteOptions, RouteResult } from '~/models';
import { clearSession, loadSession, saveSession, type Session } from '~/services/session';
import { placesFromBundle } from '../places';
import { FeatureUnavailableError, type AppContent, type BookingRequest, type PropertyBundle, type StopDistance, type TourRepository, type TourRouteResult } from '../tourRepository';
import { ApiClient, ApiError } from './apiClient';
import type { ApiDistancesResponse, ApiGraph, ApiLoginResponse, ApiMapResponse, ApiPropertyDetail, ApiPropertySummary, ApiRouteResponse, ApiStopsResponse, ApiTourRouteResponse } from './apiTypes';
import { parseBundle, parseDistances, parseListing, parseRoute, parseTourRoute } from './parsers';

/**
 * The production provider: the Pynwheel Tour App API, served by the Rails CMS
 * (`Api::TourApp::V1`, prefix `/api/tour/v1`) over the real Pynwheel data.
 *
 *   POST {API}/auth/login, /logout, GET /auth/me
 *   GET  {API}/properties, /properties/{id}
 *   GET  {API}/properties/{id}/stops | /map | /map/levels/{id} | /map/levels/{id}/svg | /graph
 *   POST {API}/properties/{id}/route | /tour-route | /stops/distances
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
    this.session = { accessToken: data.access_token, expiresAt: data.expires_at ?? null, user: data.user, propertyId: previous?.user.id === data.user.id ? previous.propertyId : null };
    this.propertiesCache = null;
    await saveSession(this.session);
    return this.session;
  }

  async logout(): Promise<void> {
    const token = this.session?.accessToken;
    this.session = null;
    this.bundleCache = null;
    this.propertiesCache = null;
    await clearSession();
    if (token) {
      try {
        await this.client.request('POST', `${API}/auth/logout`, undefined, { Authorization: `Bearer ${token}` }, false);
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
      await this.client.get(`${API}/auth/me`);
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
      const { data } = await this.client.post<ApiTourRouteResponse>(`${API}/properties/${id}/tour-route`, { stop_ids: nodes, step_free: options.stepFree === true, avoid_blockers: options.avoidBlockers !== false });
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

  // --------------------------------------------- features without a backend
  async askConcierge(_question: string, context: { stopName: string | null }): Promise<string> {
    const property = this.bundleCache?.bundle.property.name ?? 'this property';
    return CONCIERGE_NOT_CONNECTED.replace('{property}', property).replace('{stop}', context.stopName ?? 'this stop');
  }

  async requestBooking(_request: BookingRequest): Promise<{ id: string }> {
    throw new FeatureUnavailableError('Booking a live tour');
  }

  async startApplication(_unitNode: string): Promise<{ id: string }> {
    throw new FeatureUnavailableError('Online applications');
  }
}
