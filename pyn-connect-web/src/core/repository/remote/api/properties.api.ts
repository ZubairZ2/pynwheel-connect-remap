import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, withQuery, type ApiResponse } from './base.api';

export interface PropertiesQuery {
  page?: number;
  q?: string;
  stage?: string;
  companyId?: string;
  product?: string;
}

/**
 * GET /communities.json — the existing CommunitiesController#index, as JSON.
 * Search, the three filters and paging are all applied server-side, so the
 * response is one page of rows regardless of how many the user can see.
 */
export const fetchProperties = (
  cookie: string | null,
  query: PropertiesQuery = {}
): Promise<ApiResponse> =>
  apiRequest(
    withQuery(CORE_URLS.properties.listing, {
      page: query.page,
      q: query.q,
      stage: query.stage,
      company_id: query.companyId,
      product: query.product
    }),
    { cookie }
  );
