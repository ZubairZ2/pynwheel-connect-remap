import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { emptyListing, loadPropertiesListing } from '~/core/repository/remote/listings.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';
import { PropertiesListingScreen } from '~/core/screens/properties/propertiesListing.screen';
import { propertiesParamsOf } from '~/core/utils/generator/listingParams';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The first page of the Properties listing for the URL's state (search, the
 * four filters, sort, page, rows per page), rendered on the server; every
 * change after that is one request from the screen to this app's listing
 * route handler (`useServerListing`), the URL kept in step.
 */
export default async function PropertiesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = propertiesParamsOf((key) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  });
  const load = await loadPropertiesListing(await readRailsCookie(), params);

  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.properties.title)}>
      <PropertiesListingScreen
        initial={load.status === 'found' ? { rows: load.rows, meta: load.meta } : emptyListing()}
        params={params}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.shared.loadFailed) : null}
      />
    </ListingScreenTemplate>
  );
}
