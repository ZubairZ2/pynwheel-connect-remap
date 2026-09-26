'use client';

import Link from 'next/link';

import { propRoute, tourContentRoute, tourSetupRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { usePropertyMap } from '~/core/hooks/usePropertyMap';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { M } from '~/core/utils/generator/map/mapText';
import { MapCanvas } from './map/MapCanvas';
import { MapDialogs } from './map/MapDialogs';
import {
  AutoPlotReportPanel,
  BedLegendPanel,
  PlacePanel,
  RoutePanel,
  SelectedPinPanel,
  SelectionPanel,
  StartingPointsPanel,
  VerticalLinksPanel
} from './map/MapPanels';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  map: PropertyMap | null;
  error?: string | null;
}

/**
 * Map & Plotting on real data: the 22-Sep design's `mapEditor` screen over
 * the property's floor plates, its unit and amenity pins, and the pathway
 * graph the legacy Auto Wayfinding page edits. Everything the user does here
 * is local to the page; the only request any button sends is the read that
 * runs the CMS routing algorithm.
 */
export const PropertyMapScreen = ({ map, error }: Props) =>
  map ? <MapEditor map={map} /> : <MapUnavailable error={error ?? null} />;

const MapEditor = ({ map }: { map: PropertyMap }) => {
  const controller = usePropertyMap(map);
  const { tabs, tools, hint, planInfo, state, actions, level, assets } = controller;
  const propId = String(map.inventory.property.id);

  return (
    <div className="bo-inv bo-map">
      <Breadcrumb
        items={[
          { label: i18n.t(M.breadcrumbRoot), href: APP_ROUTES.properties },
          { label: map.inventory.property.name, href: propRoute(propId) },
          { label: i18n.t(M.breadcrumbCurrent) }
        ]}
      />

      <div className="bo-inv__header">
        <div className="bo-inv__heading">
          <h2 className="bo-inv__title">{i18n.t(M.title)}</h2>
          <p className="bo-inv__summary">{i18n.t(M.subtitle)}</p>
        </div>
        <div className="bo-inv__headactions">
          <Link href={tourContentRoute(propId)} className="bo-inv__ghost">
            {i18n.t(M.header.inventory)}
          </Link>
          <Link href={tourSetupRoute(propId)} className="bo-inv__ghost">
            {i18n.t(M.header.tourSetup)}
          </Link>
        </div>
      </div>

      <p className="bo-map__readonly" role="note">
        {i18n.t(M.readOnly)}
      </p>

      <div className="bo-map__layout">
        <div className="bo-map__main">
          <div className="bo-map__levels" role="tablist" aria-label={i18n.t(M.level.floor).replace(' {floor}', 's')}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.active}
                className={`bo-map__level${tab.active ? ' bo-map__level--active' : ''}`}
                onClick={() => actions.pickLevel(tab.id)}
              >
                <span className="bo-map__levelsub">{tab.sub}</span>
                <span className="bo-map__levellabel">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bo-map__toolbar">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`bo-map__tool${tool.active ? ' bo-map__tool--active' : ''}`}
                aria-pressed={tool.active}
                onClick={() => actions.pickTool(tool.id)}
              >
                <Icon name={tool.icon} />
                {tool.label}
              </button>
            ))}
            <button type="button" className="bo-map__tool bo-map__tool--accent" onClick={actions.autoPlot}>
              <Icon name="grid" />
              {i18n.t(M.tools.autoPlot)}
            </button>
            <button
              type="button"
              className={`bo-map__tool${state.tool === 'hallway' ? ' bo-map__tool--active' : ''}`}
              aria-pressed={state.tool === 'hallway'}
              onClick={actions.toggleHallways}
            >
              <Icon name="drag" />
              {i18n.t(state.tool === 'hallway' ? M.tools.hallwayStop : M.tools.hallway)}
            </button>
            <div className="bo-map__gridtoggle">
              <span className="bo-map__gridlabel">{i18n.t(M.tools.grid)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={state.gridOn}
                aria-label={i18n.t(M.tools.grid)}
                className={`bo-switch bo-switch--control bo-map__switch${state.gridOn ? ' bo-switch--on' : ''}`}
                onClick={actions.toggleGrid}
              >
                <span className="bo-switch__knob" />
              </button>
            </div>
            <div className="bo-map__spacer" />
            <span className="bo-map__hint" role="status">
              {hint}
            </span>
            <button type="button" className="bo-map__publish" onClick={actions.openPublish}>
              {i18n.t(M.tools.publish)}
            </button>
          </div>

          {level && planInfo && (
            <div className="bo-map__planbar">
              <span className="bo-map__planlevel">{planInfo.levelLabel}</span>
              <span className="bo-map__plankind">{planInfo.kindLabel}</span>
              <span className="bo-map__planfile">
                {planInfo.fileLabel} · {planInfo.countLabel}
                {planInfo.local ? ` · ${i18n.t(M.plan.localPreview)}` : ''}
              </span>
              <div className="bo-map__spacer" />
              <button type="button" className="bo-map__planbtn" onClick={actions.uploadSvg}>
                {i18n.t(M.plan.uploadSvg)}
              </button>
              <button type="button" className="bo-map__planbtn" onClick={actions.uploadRaster}>
                {i18n.t(M.plan.uploadImage)}
              </button>
              <span className="bo-map__droptarget">{i18n.t(M.plan.dropTarget)}</span>
              <button
                type="button"
                className={`bo-map__planbtn bo-map__planbtn--left${state.dropSlot === 'svg' ? ' bo-map__planbtn--on' : ''}`}
                aria-pressed={state.dropSlot === 'svg'}
                onClick={() => actions.pickDropSlot('svg')}
              >
                {i18n.t(M.plan.dropSvg)}
              </button>
              <button
                type="button"
                className={`bo-map__planbtn bo-map__planbtn--right${state.dropSlot === 'bg' ? ' bo-map__planbtn--on' : ''}`}
                aria-pressed={state.dropSlot === 'bg'}
                onClick={() => actions.pickDropSlot('bg')}
              >
                {i18n.t(M.plan.dropBackground)}
              </button>
              {planInfo.hasBoth && (
                <button
                  type="button"
                  className={`bo-map__planbtn${state.svgLayer ? ' bo-map__planbtn--on' : ''}`}
                  aria-pressed={state.svgLayer}
                  onClick={actions.toggleSvgLayer}
                  title={assets?.svg?.name}
                >
                  {i18n.t(M.plan.svgOnly)}
                </button>
              )}
              {planInfo.has && (
                <button type="button" className="bo-map__planbtn bo-map__planbtn--danger" onClick={actions.clearPlan}>
                  {i18n.t(M.plan.removePlan)}
                </button>
              )}
            </div>
          )}

          <MapCanvas controller={controller} />
        </div>

        <aside className="bo-map__side">
          <PlacePanel controller={controller} />
          <AutoPlotReportPanel controller={controller} />
          <SelectedPinPanel controller={controller} />
          <StartingPointsPanel controller={controller} />
          <SelectionPanel controller={controller} />
          <RoutePanel controller={controller} />
          <BedLegendPanel controller={controller} />
          <VerticalLinksPanel controller={controller} />
        </aside>
      </div>

      <MapDialogs controller={controller} />
    </div>
  );
};

const MapUnavailable = ({ error }: { error: string | null }) => (
  <div className="bo-inv">
    <Breadcrumb items={[{ label: i18n.t(M.breadcrumbRoot), href: APP_ROUTES.properties }, { label: i18n.t(M.breadcrumbCurrent) }]} />
    {error ? (
      <div className="bo-error" role="alert">
        {error}
      </div>
    ) : (
      <div className="bo-section bo-section--empty" role="status">
        <h2 className="bo-section__title">{i18n.t(M.notFound.title)}</h2>
        <p className="bo-section__subtitle">{i18n.t(M.notFound.body)}</p>
        <Link href={APP_ROUTES.properties} className="bo-linkbutton">
          {i18n.t(M.notFound.back)}
        </Link>
      </div>
    )}
  </div>
);
