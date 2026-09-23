import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, withQuery, type ApiResponse } from './base.api';

export interface CompaniesQuery {
  page?: number;
  q?: string;
}

/**
 * GET /companies.json — the existing CompaniesController#index, as JSON.
 * Paging and search happen server-side: one page of rows comes back, never the
 * whole table.
 */
export const fetchCompanies = (
  cookie: string | null,
  query: CompaniesQuery = {}
): Promise<ApiResponse> =>
  apiRequest(withQuery(CORE_URLS.companies.listing, { page: query.page, q: query.q }), { cookie });
