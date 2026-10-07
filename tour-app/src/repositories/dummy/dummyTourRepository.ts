import type { MapLevel, Place, PropertyListing, RouteOptions, RouteResult } from '~/models';
import type { Session } from '~/services/session';
import { placesFromBundle } from '../places';
import {
  APP_VERSION,
  AR_INIT_LABELS,
  BEST_MATCH_PERCENT,
  BEST_MATCH_REASONS,
  BOOKING_DAYS,
  BOOKING_TIMES,
  CONCIERGE_ANSWERS,
  CONCIERGE_FALLBACK,
  CONCIERGE_GREETING_GENERAL,
  CONCIERGE_GREETING_STOP,
  CONCIERGE_HUMAN_REPLY,
  CONCIERGE_PROMPTS,
  FIRST_NAME,
  HELP_ITEMS,
  HI_RISE_LISTINGS,
  NEARBY_PROPERTIES,
  ONBOARDING_SLIDES,
  SUPPORT_EMAIL,
  TOUR_HISTORY,
  VISITOR,
  buildDummyProperty,
  type DummyProperty
} from '~/dummy';
import { RouteService } from '~/wayfinding/routeService';
import { FeatureUnavailableError, type AppContent, type BookingRequest, type PropertyBundle, type StopDistance, type TourRepository, type TourRouteResult } from '../tourRepository';

/**
 * The dummy provider: answers every repository call from local dummy data,
 * after a short simulated delay so loading states are exercised, and runs
 * the real routing engine over the dummy graph. Works fully offline.
 *
 * Every value it returns that reaches the screen is marked `*` in the data.
 */

const LATENCY_MS = { read: 420, route: 520, concierge: 850, write: 600 };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fill = (template: string, params: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');

export class DummyTourRepository implements TourRepository {
  readonly source = 'dummy' as const;

  private data: DummyProperty | null = null;

  private readonly routers = new Map<string, RouteService>();

  private session: Session | null = null;

  private propertyId: number | null = 1;

  constructor(private readonly latency: Partial<typeof LATENCY_MS> = {}) {}

  // --- session: any email and password sign in (demo data, no backend)
  async login(email: string, _password: string): Promise<Session> {
    await this.delay('write');
    this.session = { accessToken: 'dummy', expiresAt: null, user: { id: 0, name: FIRST_NAME.replace(/ \*$/, ''), email, role: 'demo' }, propertyId: this.propertyId };
    return this.session;
  }

  async logout(): Promise<void> {
    this.session = null;
  }

  async restoreSession(): Promise<Session | null> {
    return null;
  }

  onSessionExpired(): () => void {
    return () => undefined;
  }

  async getProperties(): Promise<PropertyListing[]> {
    await this.delay('read');
    return NEARBY_PROPERTIES.map((p) => ({ ...p, current: p.id === this.propertyId }));
  }

  async selectProperty(propertyId: number): Promise<void> {
    this.propertyId = propertyId;
    if (this.session) this.session = { ...this.session, propertyId };
  }

  currentPropertyId(): number | null {
    return this.propertyId;
  }

  private get bundle(): DummyProperty {
    if (!this.data) this.data = buildDummyProperty();
    return this.data;
  }

  private delay(kind: keyof typeof LATENCY_MS): Promise<void> {
    return wait(this.latency[kind] ?? LATENCY_MS[kind]);
  }

  private router(options: RouteOptions = {}): RouteService {
    const key = `${options.stepFree === true}|${options.avoidBlockers !== false}`;
    let router = this.routers.get(key);
    if (!router) {
      router = new RouteService(this.bundle.graph, { stepFree: options.stepFree === true, avoidBlockers: options.avoidBlockers !== false });
      this.routers.set(key, router);
    }
    return router;
  }

  async getProperty(): Promise<PropertyBundle> {
    await this.delay('read');
    const { property, buildings, levels, graph, units, amenities, stops, arPins, floorLabels } = this.bundle;
    return { property, buildings, levels, graph, units, amenities, stops, arPins, floorLabels, demo: true };
  }

  async getContent(): Promise<AppContent> {
    await this.delay('read');
    return {
      visitor: VISITOR,
      firstName: FIRST_NAME,
      nearbyProperties: NEARBY_PROPERTIES,
      hiRiseListings: HI_RISE_LISTINGS,
      tourHistory: TOUR_HISTORY,
      onboarding: ONBOARDING_SLIDES,
      arInitLabels: AR_INIT_LABELS,
      help: HELP_ITEMS,
      supportEmail: SUPPORT_EMAIL,
      concierge: {
        answers: CONCIERGE_ANSWERS,
        fallback: CONCIERGE_FALLBACK,
        greetingStop: CONCIERGE_GREETING_STOP,
        greetingGeneral: CONCIERGE_GREETING_GENERAL,
        humanReply: CONCIERGE_HUMAN_REPLY,
        prompts: CONCIERGE_PROMPTS
      },
      booking: { days: BOOKING_DAYS, times: BOOKING_TIMES },
      bestMatch: { reasons: BEST_MATCH_REASONS, percent: BEST_MATCH_PERCENT },
      appVersion: APP_VERSION
    };
  }

  async getPlaces(): Promise<Place[]> {
    await this.delay('read');
    return placesFromBundle(await this.getProperty());
  }

  async getLevelSvg(_level: MapLevel): Promise<Blob> {
    // Demo levels carry inline vector geometry, not a floor SVG file.
    throw new FeatureUnavailableError('A floor SVG file');
  }

  async findRoute(from: string, to: string, options: RouteOptions = {}): Promise<RouteResult> {
    await this.delay('route');
    return this.router(options).find(from, to, { fromFloor: options.fromFloor, toFloor: options.toFloor });
  }

  async getTourRoute(stopNodes: string[] | null, options: RouteOptions = {}): Promise<TourRouteResult> {
    await this.delay('route');
    return this.router(options).tour(stopNodes);
  }

  async getStopDistances(nodes: string[]): Promise<Record<string, StopDistance>> {
    await this.delay('read');
    const start = this.bundle.graph.tour?.start;
    const router = this.router();
    const out: Record<string, StopDistance> = {};
    nodes.forEach((node) => {
      if (!start) return;
      const result = router.find(start, node, { fromFloor: this.bundle.graph.tour?.startingFloor ?? null });
      if (!result.ok) {
        out[node] = { lengthPx: 0, lengthFt: null, durationS: null, direction: 'level', unreachable: result.error.message };
        return;
      }
      const up = result.route.legs.some((l) => l.kind !== 'walk' && l.kind !== 'outdoor' && (l.floorTo ?? 0) > (l.floorFrom ?? 0));
      const down = result.route.legs.some((l) => l.kind !== 'walk' && l.kind !== 'outdoor' && (l.floorTo ?? 0) < (l.floorFrom ?? 0));
      out[node] = { lengthPx: result.route.lengthPx, lengthFt: result.route.lengthFt, durationS: result.route.durationS, direction: up ? 'up' : down ? 'down' : 'level', unreachable: null };
    });
    return out;
  }

  async askConcierge(question: string, context: { stopName: string | null }): Promise<string> {
    await this.delay('concierge');
    const text = question.toLowerCase();
    const params = { stop: context.stopName ?? 'this stop', property: this.bundle.property.name };
    const hit = CONCIERGE_ANSWERS.find((a) => a.keywords.some((k) => text.includes(k)));
    return fill(hit ? hit.answer : CONCIERGE_FALLBACK, params);
  }

  async requestBooking(request: BookingRequest): Promise<{ id: string }> {
    await this.delay('write');
    void request;
    return { id: `bk-${Date.now()}` };
  }

  async startApplication(unitNode: string): Promise<{ id: string }> {
    await this.delay('write');
    return { id: `app-${unitNode}-${Date.now()}` };
  }
}
