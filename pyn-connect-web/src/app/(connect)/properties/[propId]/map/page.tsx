import { redirect } from 'next/navigation';
import { preload } from 'react-dom';

import { APP_API, APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { PropertyScope } from '~/core/components/connect/PropertyScope';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { loadPropertyMap, trimForMapScreen } from '~/core/repository/remote/propertyMap.server';
import { readRailsCookie } from '~/core/session/session.server';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { MapEditorScreen } from '~/core/screens/connect/properties/mapEditor.screen';
import { PropertyMapScreen } from '~/core/screens/properties/propertyMap.screen';
import { activeSpace, backgroundOf, generateMapLevels, mapBuildings, planAssets } from '~/core/utils/generator/map/mapLevels.generator';
import { initialLocalMapState } from '~/core/utils/generator/map/mapState';

export const dynamic = 'force-dynamic';

/** Real properties have integer ids; demo slugs (`luxe`) keep the demo screen, as on Property Detail. */
const REAL_ID = /^\d+$/;

/**
 * Tour Setup's "View on Plan" / "Plot on Plan" land here with the stop's
 * level and pin (`?level=floorplate:12&pin=unit:34&arm=1`): the map opens
 * on that floorplate with the pin selected, or armed for plotting.
 */
const initialFrom = (query: Record<string, string | string[] | undefined>) => {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  const level = one(query.level);
  const pin = one(query.pin);
  const arm = one(query.arm) === '1';
  return level || pin ? { levelId: level, pin, arm } : null;
};

/**
 * Starts the browser on the first floor's SVG (and a Beans property's shared
 * background) before the page's JavaScript has arrived: the hook's own
 * request for the same URL consumes the preloaded response. The level and
 * layer are the ones `usePropertyMap` opens on, decided the same way; a
 * floor that opens on its image preloads nothing (performance audit,
 * October 11, 2026: C2).
 */
const preloadFirstPlan = (map: PropertyMap, levelId: string | null) => {
  const levels = generateMapLevels(map);
  const first = (levelId && levels.find((row) => row.id === levelId)) || levels[0] || null;
  if (!first || !planAssets(first, undefined).svg) return;
  const buildings = mapBuildings(map, levels);
  const opening = initialLocalMapState(first.id, buildings.length > 1 ? (first.building ?? buildings[0]) : null, 'svg');
  if (activeSpace(first, opening) !== 'svg') return;
  const propertyId = map.inventory.property.id;
  preload(APP_API.planSvg(propertyId, { kind: first.kind, id: first.recordId }), { as: 'fetch', crossOrigin: 'anonymous' });
  if (backgroundOf(map)) preload(APP_API.planSvg(propertyId, { background: true }), { as: 'fetch', crossOrigin: 'anonymous' });
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ propId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { propId } = await params;
  const initial = initialFrom(await searchParams);
  const title = i18n.t(CORE_STRINGS.mapPlotting.title);

  if (!REAL_ID.test(propId)) {
    return (
      <ConnectScreenTemplate title={title} demo>
        <PropertyScope propId={propId}>
          <MapEditorScreen />
        </PropertyScope>
      </ConnectScreenTemplate>
    );
  }

  const load = await loadPropertyMap(await readRailsCookie(), Number(propId));
  if (load.status === 'unauthorized') redirect(APP_ROUTES.signIn);
  if (load.status === 'found') preloadFirstPlan(load.map, initial?.levelId ?? null);

  return (
    <ConnectScreenTemplate title={title}>
      <PropertyMapScreen
        map={load.status === 'found' ? trimForMapScreen(load.map) : null}
        initial={initial}
        error={load.status === 'failed' ? i18n.t(CORE_STRINGS.mapPlotting.loadFailed) : null}
      />
    </ConnectScreenTemplate>
  );
}
