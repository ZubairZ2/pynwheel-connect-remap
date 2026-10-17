import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, type ApiResponse } from './base.api';

/**
 * The Tour Setup module endpoints (`/communities/:id/connect/*`,
 * Connect::LocksController, StopsController, VisitorsController,
 * BookingController): one GET and one write per path. The route handler
 * (`app/api/properties/[propId]/tour/[...path]`) decides which paths exist
 * and which Rails verb each write uses.
 */
export const fetchTourModule = (cookie: string | null, propertyId: number, path: string, query?: string): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.connect.path(propertyId, path, query), { cookie });

export const fetchTourModuleText = (cookie: string | null, propertyId: number, path: string, query?: string): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.connect.path(propertyId, path, query), { cookie, accept: 'text/csv', parseJson: false });

export const writeTourModule = (
  cookie: string | null,
  propertyId: number,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  payload: unknown,
  csrfToken: string | null
): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.connect.path(propertyId, path), { method, cookie, body: JSON.stringify(payload ?? {}), contentType: 'application/json', csrfToken });
