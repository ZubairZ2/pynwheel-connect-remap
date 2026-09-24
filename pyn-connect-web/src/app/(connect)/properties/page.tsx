import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { fetchProperties } from '~/core/repository/remote/api/properties.api';
import { parseProperties } from '~/core/repository/parser/property.parser';
import { parseListingMeta } from '~/core/repository/parser/envelope.parser';
import { readRailsCookie } from '~/core/session/session.server';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';
import { PropertiesListingScreen } from '~/core/screens/properties/propertiesListing.screen';
import type { PropertyFilters } from '~/core/utils/generator/propertyListing.generator';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    stage?: string;
    company_id?: string;
    product?: string;
    data_provider?: string;
  }>;
}

/**
 * A filter parameter holds one value or several, comma-separated. `all` is how
 * the single-select filters before phase 2c said "no filter"; old bookmarks
 * may still carry it.
 */
const listParam = (value?: string): string[] =>
  Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '' && part !== 'all')
    )
  );

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookie = await readRailsCookie();

  const filters: PropertyFilters = {
    query: params.q ?? '',
    stage: listParam(params.stage),
    companyId: listParam(params.company_id),
    product: listParam(params.product),
    dataProvider: listParam(params.data_provider)
  };

  // Search, filters and paging all resolve on the server; the response is one
  // page of rows however many communities the user can see.
  const response = await fetchProperties(cookie, {
    page: Number(params.page) || 1,
    q: filters.query,
    stage: filters.stage,
    companyId: filters.companyId,
    product: filters.product,
    dataProvider: filters.dataProvider
  });

  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const properties = response.ok ? parseProperties(response.body) : [];
  const meta = parseListingMeta(response.body);

  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.properties.title)}>
      <PropertiesListingScreen
        properties={properties}
        pagination={meta.pagination}
        filters={filters}
        companyOptions={meta.companyOptions}
        dataProviderOptions={meta.dataProviderOptions}
        scopeTotal={meta.scopeTotalCount}
        error={response.ok ? null : i18n.t(CORE_STRINGS.shared.loadFailed)}
      />
    </ListingScreenTemplate>
  );
}
