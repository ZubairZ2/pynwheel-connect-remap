import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { loadPropertyInventory } from '~/core/repository/remote/propertyInventory.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyInventoryScreen as DemoPropertyInventoryScreen } from '~/core/screens/connect/properties/propertyInventory.screen';
import { PropertyInventoryScreen } from '~/core/screens/properties/propertyInventory.screen';
import { cmsToday } from '~/core/utils/date/cmsToday';
import { asInventoryTab } from '~/core/utils/generator/inventory/inventoryHeader.generator';

export const dynamic = 'force-dynamic';

/** Real properties have integer ids; demo slugs (`luxe`) keep the demo screen, as on Property Detail. */
const REAL_ID = /^\d+$/;

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ propId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { propId } = await params;
  const title = i18n.t(CORE_STRINGS.inventory.title);

  if (!REAL_ID.test(propId)) {
    return (
      <ConnectScreenTemplate title={title}>
        <PropertyScope propId={propId}>
          <DemoPropertyInventoryScreen />
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  const { tab } = await searchParams;
  const load = await loadPropertyInventory(await readRailsCookie(), Number(propId));
  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);

  return (
    <ConnectScreenTemplate title={title}>
      <PropertyInventoryScreen
        inventory={load.status === 'found' ? load.inventory : null}
        initialTab={asInventoryTab(Array.isArray(tab) ? tab[0] : tab)}
        today={cmsToday()}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.inventory.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
