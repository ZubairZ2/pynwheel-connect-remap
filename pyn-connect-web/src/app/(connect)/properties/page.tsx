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

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    stage?: string;
    company_id?: string;
    product?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookie = await readRailsCookie();

  const filters = {
    query: params.q ?? '',
    stage: params.stage ?? 'all',
    companyId: params.company_id ?? 'all',
    product: params.product ?? 'all'
  };

  // Search, filters and paging all resolve on the server; the response is one
  // page of rows however many communities the user can see.
  const response = await fetchProperties(cookie, {
    page: Number(params.page) || 1,
    q: filters.query,
    stage: filters.stage,
    companyId: filters.companyId,
    product: filters.product
  });

  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const properties = response.ok ? parseProperties(response.body) : [];
  const meta = parseListingMeta(response.body);

  return (
    <ListingScreenTemplate
      headerTitle={i18n.t(CORE_STRINGS.properties.title)}
      recordCount={response.ok ? meta.totalCount : undefined}
    >
      <PropertiesListingScreen
        properties={properties}
        pagination={meta.pagination}
        filters={filters}
        companyOptions={meta.companyOptions}
        error={response.ok ? null : i18n.t(CORE_STRINGS.shared.loadFailed)}
      />
    </ListingScreenTemplate>
  );
}
