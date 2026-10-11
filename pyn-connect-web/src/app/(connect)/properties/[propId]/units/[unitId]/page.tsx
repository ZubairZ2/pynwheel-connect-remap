import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { UnitScope } from '~/core/components/connect/UnitScope';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { loadInventoryUnitsPage, loadPropertyInventory } from '~/core/repository/remote/propertyInventory.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { UnitDetailScreen as DemoUnitDetailScreen } from '~/core/screens/connect/properties/unitDetail.screen';
import { UnitDetailScreen } from '~/core/screens/properties/unitDetail.screen';
import { cmsToday } from '~/core/utils/date/cmsToday';

export const dynamic = 'force-dynamic';

/** Real records have integer ids; demo slugs keep the demo screen, as on Property Inventory. */
const REAL_ID = /^\d+$/;

/**
 * One unit of the property: the inventory without its units (floorplates with
 * their meta, floor plans, amenities — what the screen and the Edit Unit
 * dialog read beside the unit) and the one unit, read as a page of one
 * through the paged units listing (`units.json?page=1&per_page=1&ids=`),
 * both in parallel. The screen used to receive every unit of the property to
 * show one (performance audit, October 11, 2026: C7).
 */
const loadUnitDetail = async (
  cookie: string | null,
  propertyId: number,
  unitId: number
): Promise<{ status: 'found'; inventory: PropertyInventory } | { status: 'missing' } | { status: 'unauthorized' } | { status: 'failed' }> => {
  const [inventory, units] = await Promise.all([
    loadPropertyInventory(cookie, propertyId, { units: false }),
    loadInventoryUnitsPage(cookie, propertyId, { page: 1, perPage: 1, ids: [unitId] })
  ]);
  if (inventory.status !== 'found') return inventory;
  if (units.status !== 'found') return units;
  return {
    status: 'found',
    inventory: {
      ...inventory.inventory,
      units: units.listing.units,
      // Not the whole set: counts (the tab badge, the Re-sync confirm's override total) keep reading the floorplates meta.
      unitsLoaded: false,
      currencySymbol: units.listing.currencySymbol || inventory.inventory.currencySymbol
    }
  };
};

export default async function Page({
  params
}: {
  params: Promise<{ propId: string; unitId: string }>;
}) {
  const { propId, unitId } = await params;
  const title = i18n.t(CORE_STRINGS.unitDetail.title);

  if (!REAL_ID.test(propId) || !REAL_ID.test(unitId)) {
    return (
      <ConnectScreenTemplate title={title} demo>
        <PropertyScope propId={propId}>
          <UnitScope unitId={unitId}>
            <DemoUnitDetailScreen />
          </UnitScope>
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  const load = await loadUnitDetail(await readRailsCookie(), Number(propId), Number(unitId));
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
