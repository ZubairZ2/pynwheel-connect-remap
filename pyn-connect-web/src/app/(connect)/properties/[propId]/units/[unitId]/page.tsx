import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { UnitScope } from '~/core/components/connect/UnitScope';
import { loadPropertyInventory } from '~/core/repository/remote/propertyInventory.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { UnitDetailScreen as DemoUnitDetailScreen } from '~/core/screens/connect/properties/unitDetail.screen';
import { UnitDetailScreen } from '~/core/screens/properties/unitDetail.screen';
import { cmsToday } from '~/core/utils/date/cmsToday';

export const dynamic = 'force-dynamic';

/** Real records have integer ids; demo slugs keep the demo screen, as on Property Inventory. */
const REAL_ID = /^\d+$/;

export default async function Page({
  params
}: {
  params: Promise<{ propId: string; unitId: string }>;
}) {
  const { propId, unitId } = await params;
  const title = i18n.t(CORE_STRINGS.unitDetail.title);

  if (!REAL_ID.test(propId) || !REAL_ID.test(unitId)) {
    return (
      <ConnectScreenTemplate title={title}>
        <PropertyScope propId={propId}>
          <UnitScope unitId={unitId}>
            <DemoUnitDetailScreen />
          </UnitScope>
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  // There is no single-unit endpoint: the unit is picked from the property's listings.
  const load = await loadPropertyInventory(await readRailsCookie(), Number(propId));
  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ConnectScreenTemplate title={title}>
      <UnitDetailScreen
        inventory={load.status === 'found' ? load.inventory : null}
        unitId={Number(unitId)}
        today={cmsToday()}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.inventory.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
