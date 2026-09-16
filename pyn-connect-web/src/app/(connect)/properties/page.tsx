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

export default async function PropertiesPage() {
  const cookie = await readRailsCookie();
  const response = await fetchProperties(cookie);

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
        error={response.ok ? null : i18n.t(CORE_STRINGS.shared.loadFailed)}
      />
    </ListingScreenTemplate>
  );
}
