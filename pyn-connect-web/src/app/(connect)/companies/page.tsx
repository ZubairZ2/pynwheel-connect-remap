import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { emptyListing, loadCompaniesListing } from '~/core/repository/remote/listings.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';
import { CompaniesListingScreen } from '~/core/screens/companies/companiesListing.screen';
import { companiesParamsOf } from '~/core/utils/generator/listingParams';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The first page of the Companies listing for the URL's state, rendered on the
 * server. From then on the screen asks this app's listing route handler for
 * every change (`useServerListing`), keeping the URL in step.
 */
export default async function CompaniesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = companiesParamsOf((key) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  });
  const load = await loadCompaniesListing(await readRailsCookie(), params);

  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.companies.title)}>
      <CompaniesListingScreen
        initial={load.status === 'found' ? { rows: load.rows, meta: load.meta } : emptyListing()}
        params={params}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.shared.loadFailed) : null}
      />
    </ListingScreenTemplate>
  );
}
