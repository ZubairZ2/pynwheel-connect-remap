import type { Place, RouteOptions, RouteResult } from '~/models';
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
import type { AppContent, BookingRequest, PropertyBundle, StopDistance, TourRepository, TourRouteResult } from '../tourRepository';

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

  constructor(private readonly latency: Partial<typeof LATENCY_MS> = {}) {}

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
    return { property, buildings, levels, graph, units, amenities, stops, arPins, floorLabels };
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
    const { graph, units, amenities, stops } = this.bundle;
    const linkedOf = (node: string) => graph.nodes.some((n) => n.id === node && n.link !== false && !!n.attach);
    const places: Place[] = [];
    units.forEach((u) =>
      places.push({
        node: u.node,
        kind: 'unit',
        name: u.name,
        meta: u.bedrooms ? `${u.bedrooms} Bed · ${u.bathrooms} Bath` : 'Unit',
        building: u.building,
        floor: u.floor,
        floors: u.floor != null ? [u.floor] : [],
        level: u.level,
        linked: linkedOf(u.node),
        routable: true
      })
    );
    amenities.forEach((a) =>
      places.push({
        node: a.node,
        kind: 'amenity',
        name: a.name,
        meta: 'Amenity',
        building: a.building,
        floor: a.floor,
        floors: a.floor != null ? [a.floor] : [],
        level: a.level,
        linked: linkedOf(a.node),
        routable: true
      })
    );
    stops.forEach((s) => {
      const vertical = graph.verticalConnections.find((v) => v.id === s.node);
      const label = s.kind.charAt(0).toUpperCase() + s.kind.slice(1);
      places.push({
        node: s.node,
        kind: 'stop',
        stopKind: s.kind,
        name: s.name,
        meta: s.kind === 'entry' ? 'Entry Point' : s.kind === 'exit' ? 'Exit Point' : s.kind === 'mail' ? 'Mail & Packages' : s.kind === 'leasing' ? 'Leasing Office' : label,
        building: s.building,
        floor: vertical ? null : s.floor,
        floors: vertical ? vertical.floors : s.floor != null ? [s.floor] : [],
        level: s.level,
        linked: linkedOf(s.node),
        routable: s.kind !== 'blocker'
      });
    });
    return places;
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
