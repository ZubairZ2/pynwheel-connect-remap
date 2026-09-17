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

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { page, q } = await searchParams;
  const cookie = await readRailsCookie();

  // Paging and search are query parameters on the Rails request: one page of
  // rows comes back, not the whole table.
  const response = await fetchCompanies(cookie, { page: Number(page) || 1, q });

  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const companies = response.ok ? parseCompanies(response.body) : [];
  const meta = parseListingMeta(response.body);

  return (
    <ListingScreenTemplate
      headerTitle={i18n.t(CORE_STRINGS.companies.title)}
      recordCount={response.ok ? meta.totalCount : undefined}
    >
      <CompaniesListingScreen
        companies={companies}
        pagination={meta.pagination}
        initialQuery={q ?? ''}
        error={response.ok ? null : i18n.t(CORE_STRINGS.shared.loadFailed)}
      />
    </ListingScreenTemplate>
  );
}
