import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { parsePropertyDetail } from '~/core/repository/parser/property.parser';
import { fetchPropertyDetail } from '~/core/repository/remote/api/properties.api';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyDetailScreen as DemoPropertyDetailScreen } from '~/core/screens/connect/properties/propertyDetail.screen';
import { PropertyDetailScreen } from '~/core/screens/properties/propertyDetail.screen';

export const dynamic = 'force-dynamic';

/**
 * Real properties are communities, whose ids are integers (the Properties
 * listing links here with them). The demo data set keys its properties by slug
 * (`luxe`, `cortsky`), and the demo screens still link to those, so a slug
 * keeps opening the demo screen until phase 3 retires the demo data.
 */
const REAL_ID = /^\d+$/;

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;
  const title = i18n.t(CORE_STRINGS.propertyDetail.title);

  if (!REAL_ID.test(propId)) {
    return (
      <ConnectScreenTemplate title={title}>
        <PropertyScope propId={propId}>
          <DemoPropertyDetailScreen />
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  // CommunitiesController#edit.json: the property's existing record, or 404
  // when it is outside the Properties listing's scope.
  const response = await fetchPropertyDetail(await readRailsCookie(), Number(propId));
  if (response.status === 401 || response.status === 302) redirect(APP_ROUTES.signIn);

  const property = response.ok ? parsePropertyDetail(response.body) : null;
  const failed = !response.ok && response.status !== 404;

  return (
    <ConnectScreenTemplate title={title}>
      <PropertyDetailScreen
        property={property}
        error={failed ? i18n.t(CORE_STRINGS.propertyDetail.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
