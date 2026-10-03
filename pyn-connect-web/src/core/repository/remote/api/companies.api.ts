import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, withQuery, type ApiResponse } from './base.api';

export interface CompaniesQuery {
  page?: number;
  /** Rows per page. Rails defaults to 10 and caps it at 100. */
  perPage?: number;
  q?: string;
  /** `active` / `inactive` (companies.inactivate). */
  status?: string[];
  /** PMS provider slugs; `none` for companies with no provider. */
  pmsProvider?: string[];
  /** `with` / `without` properties. */
  properties?: string[];
  /** A sortable column's key and direction (`ListingSort` in Rails); absent, the default order. */
  sort?: string;
  dir?: 'asc' | 'desc';
}

/**
 * GET /companies.json — the existing CompaniesController#index, as JSON.
 * Paging, search, the three filters and sorting happen server-side: one page
 * of rows comes back, never the whole table. Each filter can hold several
 * values, sent as one comma-separated parameter.
 */
export const fetchCompanies = (
  cookie: string | null,
  query: CompaniesQuery = {}
): Promise<ApiResponse> =>
  apiRequest(
    withQuery(CORE_URLS.companies.listing, {
      page: query.page,
      per_page: query.perPage,
      q: query.q,
      status: query.status?.join(','),
      pms_provider: query.pmsProvider?.join(','),
      properties: query.properties?.join(','),
      sort: query.sort,
      dir: query.dir
    }),
    { cookie }
  );
