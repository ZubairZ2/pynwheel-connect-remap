import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, type ApiResponse } from './base.api';

/**
 * GET the legacy Auto Wayfinding page's data as JSON
 * (`AutomatePlottingController#index`): hallways, elevators, building starting
 * points, the tour's start and stops, doors, and stored OCR text. Rails scopes
 * the property to the user (`check_community`: 302 when it is not theirs,
 * 404 when the id does not exist).
 */
export const fetchWayfindingGraph = (cookie: string | null, propertyId: number): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.wayfinding.graph(propertyId), { cookie });

/**
 * GET the CMS routing algorithm's answer for the property
 * (`AutomatePlottingController#shortest_path`): the legacy "Run Algo" button.
 * A read: the action computes the route from stored hallways and stops and
 * persists nothing. `sorting` visits the tour stops in their sort order, as
 * the Tour app does.
 */
export const fetchWayfindingRoute = (
  cookie: string | null,
  propertyId: number,
  pathType: 'sorting' | 'actual shortest' = 'sorting'
): Promise<ApiResponse> => apiRequest(CORE_URLS.wayfinding.route(propertyId, pathType), { cookie });

/**
 * GET a route between two places on the persisted graph
 * (`AutomatePlottingController#shortest_path` with `from` / `to`, through
 * `Wayfinding::RouteService`): what the Tour App would be told. A read.
 */
export const fetchWayfindingPath = (
  cookie: string | null,
  propertyId: number,
  params: { from: string; to: string; stepFree: boolean; fromFloor?: number | null; toFloor?: number | null }
): Promise<ApiResponse> => apiRequest(CORE_URLS.wayfinding.path(propertyId, params), { cookie });

/**
 * The three Connect writes. Each is one JSON PUT the Rails side applies in
 * one transaction and answers in the Connect envelope: 200 with the result,
 * 409 `stale_version` with the current state, 422 with per-item `errors`,
 * 403 `csrf` / `forbidden`, 404 `disabled` / `unknown_level`, 401 signed out.
 */
export const saveWayfindingGraph = (cookie: string | null, propertyId: number, payload: unknown, csrfToken: string | null): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.wayfinding.saveGraph(propertyId), { method: 'PUT', cookie, body: JSON.stringify(payload), contentType: 'application/json', csrfToken });

export const saveTourSetup = (cookie: string | null, propertyId: number, payload: unknown, csrfToken: string | null): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.wayfinding.saveTourSetup(propertyId), { method: 'PUT', cookie, body: JSON.stringify(payload), contentType: 'application/json', csrfToken });

export const setStopList = (
  cookie: string | null,
  propertyId: number,
  payload: { stop_type: 'unit' | 'amenity'; stop_id: number; show: boolean },
  csrfToken: string | null
): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.wayfinding.stopList(propertyId), { method: 'PUT', cookie, body: JSON.stringify(payload), contentType: 'application/json', csrfToken });
