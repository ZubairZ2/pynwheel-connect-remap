import type { Place, RouteOptions, RouteResult } from '~/models';
import { RepositoryUnavailableError, type AppContent, type BookingRequest, type PropertyBundle, type StopDistance, type TourRepository, type TourRouteResult } from '../tourRepository';

/**
 * The future provider — NOT enabled, NOT wired, and it makes no request.
 *
 * It exists so the boundary is visible: when the Rails Tour App API is
 * connected, this class implements `TourRepository` over
 *
 *   GET /api/self_tour/v1/communities/:id/wayfinding.json            → PropertyBundle (levels, nodes, edges, vertical_connections, gates, tour)
 *   GET /api/self_tour/v1/communities/:id/wayfinding/route.json      → RouteResult  (from, to, step_free, avoid_blockers, from_floor, to_floor)
 *   GET /api/self_tour/v1/communities/:id/wayfinding/tour_route.json → TourRouteResult
 *
 * with the existing self-tour token scheme, an ETag per graph version, and
 * a parser that camelCases the payload into the models in `~/models`. The
 * screens will not change: they already consume those models through the
 * repository interface.
 *
 * Until then every method throws `RepositoryUnavailableError`, and
 * `createTourRepository()` never constructs it.
 */
export class PynwheelApiTourRepository implements TourRepository {
  readonly source = 'pynwheel-api' as const;

  constructor(
    public readonly baseUrl: string,
    public readonly communityId: number
  ) {}

  private unavailable(): never {
    throw new RepositoryUnavailableError('PynwheelApiTourRepository');
  }

  getProperty(): Promise<PropertyBundle> {
    return this.unavailable();
  }

  getContent(): Promise<AppContent> {
    return this.unavailable();
  }

  getPlaces(): Promise<Place[]> {
    return this.unavailable();
  }

  findRoute(_from: string, _to: string, _options?: RouteOptions): Promise<RouteResult> {
    return this.unavailable();
  }

  getTourRoute(_stopNodes: string[] | null, _options?: RouteOptions): Promise<TourRouteResult> {
    return this.unavailable();
  }

  getStopDistances(_nodes: string[]): Promise<Record<string, StopDistance>> {
    return this.unavailable();
  }

  askConcierge(_question: string, _context: { stopName: string | null }): Promise<string> {
    return this.unavailable();
  }

  requestBooking(_request: BookingRequest): Promise<{ id: string }> {
    return this.unavailable();
  }

  startApplication(_unitNode: string): Promise<{ id: string }> {
    return this.unavailable();
  }
}
