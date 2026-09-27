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
