import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { loadPropertyMap } from '~/core/repository/remote/propertyMap.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { TourSetupScreen as DemoTourSetupScreen } from '~/core/screens/connect/properties/tourSetup.screen';
import { TourSetupScreen } from '~/core/screens/properties/tourSetup.screen';

export const dynamic = 'force-dynamic';

/** Real properties have integer ids; demo slugs (`luxe`) keep the demo screen, as on Property Detail. */
const REAL_ID = /^\d+$/;

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;
  const title = i18n.t(CORE_STRINGS.tourSetup.title);

  if (!REAL_ID.test(propId)) {
    return (
      <ConnectScreenTemplate title={title} demo>
        <PropertyScope propId={propId}>
          <DemoTourSetupScreen />
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  const load = await loadPropertyMap(await readRailsCookie(), Number(propId));
  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ConnectScreenTemplate title={title}>
      <TourSetupScreen
        map={load.status === 'found' ? load.map : null}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.tourSetup.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
