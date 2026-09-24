'use client';

import Link from 'next/link';
import { useId } from 'react';

import { mapEditorRoute, propRoute, tourSetupRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { ImageViewer } from '~/core/components/organisms/ImageViewer';
import { usePropertyInventory } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type { InventoryTab } from '~/core/utils/generator/inventory/inventoryHeader.generator';
import { S, t } from '~/core/utils/generator/inventory/inventoryText';
import { AmenitiesSection } from './inventory/AmenitiesSection';
import { FloorplansSection } from './inventory/FloorplansSection';
import { FloorplatesSection } from './inventory/FloorplatesSection';
import { InventoryDialogs } from './inventory/InventoryDialogs';
import { UnitsSection } from './inventory/UnitsSection';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  inventory: PropertyInventory | null;
  initialTab: InventoryTab;
  /** The server's date (yyyy-mm-dd), so "available now" reads the same on both renders. */
  today: string;
  error?: string | null;
}

/**
 * Property Inventory on real data: the 22-Sep design's `tourContent` screen,
 * fed by the legacy Floorplates, Floorplans, Units and Amenities listings.
 * Read-only: every write action opens its dialog or confirmation and changes
 * nothing.
 */
export const PropertyInventoryScreen = ({ inventory, initialTab, today, error }: Props) =>
  inventory ? (
    <Inventory inventory={inventory} initialTab={initialTab} today={today} />
  ) : (
    <InventoryUnavailable error={error ?? null} />
  );

const Inventory = ({ inventory, initialTab, today }: Omit<Props, 'inventory' | 'error'> & { inventory: PropertyInventory }) => {
  const state = usePropertyInventory(inventory, initialTab);
  const propId = String(inventory.property.id);
  const tablistId = useId();
  const actions = { openViewer: state.openViewer, openDialog: state.openDialog, confirm: state.confirm };

  return (
    <div className="bo-inv">
      <Breadcrumb
        items={[
          { label: i18n.t(S.breadcrumbRoot), href: APP_ROUTES.properties },
          { label: state.header.name, href: propRoute(propId) },
          { label: i18n.t(S.breadcrumbCurrent) }
        ]}
      />

      <div className="bo-inv__header">
        <div className="bo-inv__heading">
          <h2 className="bo-inv__title">{i18n.t(S.title)}</h2>
          <p className="bo-inv__summary">{state.header.summary}</p>
        </div>
        <div className="bo-inv__headactions">
          <Link href={mapEditorRoute(propId)} className="bo-inv__ghost">
            {i18n.t(S.header.mapPlotting)}
          </Link>
          <Link href={tourSetupRoute(propId)} className="bo-inv__ghost">
            {i18n.t(S.header.tourSetup)}
          </Link>
        </div>
      </div>

      <div className="bo-inv__tabs" role="tablist" aria-label={i18n.t(S.tabs.label)}>
        {state.tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${tablistId}-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.active}
            aria-controls={`${tablistId}-panel`}
            className={`bo-inv__tab${tab.active ? ' bo-inv__tab--active' : ''}`}
            onClick={() => state.selectTab(tab.id)}
          >
            {tab.label}
            <span className="bo-inv__tabcount">{tab.count.toLocaleString('en-US')}</span>
          </button>
        ))}
      </div>

      <div id={`${tablistId}-panel`} role="tabpanel" aria-labelledby={`${tablistId}-${state.tab}`}>
        {state.tab === 'floorplates' && <FloorplatesSection inventory={inventory} actions={actions} />}
        {state.tab === 'floorplans' && <FloorplansSection inventory={inventory} actions={actions} />}
        {state.tab === 'units' && <UnitsSection inventory={inventory} today={today} actions={actions} />}
        {state.tab === 'amenities' && <AmenitiesSection inventory={inventory} actions={actions} />}
      </div>

      <InventoryDialogs inventory={inventory} dialog={state.dialog} onClose={state.closeDialog} onView={state.openViewer} />

      <ImageViewer
        images={state.viewer.images}
        index={state.viewer.index}
        onIndexChange={state.setViewerIndex}
        onClose={state.closeViewer}
        labels={{
          close: i18n.t(S.viewer.close),
          previous: i18n.t(S.viewer.previous),
          next: i18n.t(S.viewer.next),
          position: (current, total) => t(S.viewer.position, { current, total }),
          unavailable: i18n.t(S.viewer.unavailable)
        }}
      />
    </div>
  );
};

const InventoryUnavailable = ({ error }: { error: string | null }) => (
  <div className="bo-inv">
    <Breadcrumb
      items={[{ label: i18n.t(S.breadcrumbRoot), href: APP_ROUTES.properties }, { label: i18n.t(S.breadcrumbCurrent) }]}
    />
    {error ? (
      <div className="bo-error" role="alert">
        {error}
      </div>
    ) : (
      <div className="bo-section bo-section--empty" role="status">
        <h2 className="bo-section__title">{i18n.t(S.notFound.title)}</h2>
        <p className="bo-section__subtitle">{i18n.t(S.notFound.body)}</p>
        <Link href={APP_ROUTES.properties} className="bo-linkbutton">
          {i18n.t(S.notFound.back)}
        </Link>
      </div>
    )}
  </div>
);
