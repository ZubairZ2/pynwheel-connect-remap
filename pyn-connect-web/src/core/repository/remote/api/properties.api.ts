import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, type ApiResponse } from './base.api';

/** GET /communities.json — the existing CommunitiesController#index, as JSON. */
export const fetchProperties = (cookie: string | null): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.properties.listing, { cookie });
