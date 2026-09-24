import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, withQuery, type ApiResponse } from './base.api';

export interface PropertiesQuery {
  page?: number;
  /** Rows per page. Rails defaults to 10 and caps it at 100. */
  perPage?: number;
  q?: string;
  stage?: string[];
  companyId?: string[];
  product?: string[];
  dataProvider?: string[];
}

/**
 * GET /communities.json — the existing CommunitiesController#index, as JSON.
 * Search, the four filters and paging are all applied server-side, so the
 * response is one page of rows regardless of how many the user can see. Each
 * filter can hold several values, sent as one comma-separated parameter.
 */
export const fetchProperties = (
  cookie: string | null,
  query: PropertiesQuery = {}
): Promise<ApiResponse> =>
  apiRequest(
    withQuery(CORE_URLS.properties.listing, {
      page: query.page,
      per_page: query.perPage,
      q: query.q,
      stage: query.stage?.join(','),
      company_id: query.companyId?.join(','),
      product: query.product?.join(','),
      data_provider: query.dataProvider?.join(',')
    }),
    { cookie }
  );
