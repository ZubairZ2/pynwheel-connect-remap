import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { lookupProperty } from '~/core/repository/remote/propertyLookup.server';
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

  const lookup = await lookupProperty(await readRailsCookie(), Number(propId));
  if (lookup.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ConnectScreenTemplate title={title}>
      <PropertyDetailScreen
        property={lookup.status === 'found' ? lookup.property : null}
        error={lookup.status === 'failed' ? i18n.t(CORE_STRINGS.propertyDetail.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
