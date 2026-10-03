import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { fetchCompanies } from '~/core/repository/remote/api/companies.api';
import { parseCompanies } from '~/core/repository/parser/company.parser';
import { parseListingMeta } from '~/core/repository/parser/envelope.parser';
import { readRailsCookie } from '~/core/session/session.server';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';
import { CompaniesListingScreen } from '~/core/screens/companies/companiesListing.screen';
import { COMPANY_SORTABLE, type CompanyFilters } from '~/core/utils/generator/companyListing.generator';
import { parseListingSort } from '~/core/utils/generator/listingSort';
import { clampPageSize } from '~/core/utils/generator/pagination.generator';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{
    page?: string;
    per_page?: string;
    q?: string;
    status?: string;
    pms_provider?: string;
    properties?: string;
    sort?: string;
    dir?: string;
  }>;
}

/** A filter parameter holds one value or several, comma-separated. */
const listParam = (value?: string): string[] =>
  Array.from(new Set((value ?? '').split(',').map((part) => part.trim()).filter((part) => part !== '' && part !== 'all')));

export default async function CompaniesPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookie = await readRailsCookie();
  const sort = parseListingSort(params.sort, params.dir, COMPANY_SORTABLE);
  const perPage = clampPageSize(params.per_page);
  const filters: CompanyFilters = {
    query: params.q ?? '',
    status: listParam(params.status),
    pmsProvider: listParam(params.pms_provider),
    properties: listParam(params.properties)
  };

  // Paging, search, filters and sorting are query parameters on the Rails
  // request: one page of rows comes back, not the whole table, in the order asked for.
  const response = await fetchCompanies(cookie, {
    page: Number(params.page) || 1,
    perPage,
    q: filters.query,
    status: filters.status,
    pmsProvider: filters.pmsProvider,
    properties: filters.properties,
    sort: sort?.key,
    dir: sort?.dir
  });

  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const companies = response.ok ? parseCompanies(response.body) : [];
  const meta = parseListingMeta(response.body);

  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.companies.title)}>
      <CompaniesListingScreen
        companies={companies}
        pagination={meta.pagination}
        filters={filters}
        sort={sort}
        providerOptions={meta.pmsProviderOptions}
        totals={{ companies: meta.scopeTotalCount, properties: meta.propertyTotalCount }}
        error={response.ok ? null : i18n.t(CORE_STRINGS.shared.loadFailed)}
      />
    </ListingScreenTemplate>
  );
}
