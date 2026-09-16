import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, type ApiResponse } from './base.api';

/** GET /companies.json — the existing CompaniesController#index, as JSON. */
export const fetchCompanies = (cookie: string | null): Promise<ApiResponse> =>
  apiRequest(CORE_URLS.companies.listing, { cookie });
