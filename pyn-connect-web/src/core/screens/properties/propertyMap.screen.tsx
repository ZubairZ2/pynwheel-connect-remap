'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { propRoute, tourContentRoute, tourSetupRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { usePropertyMap, type MapInitial } from '~/core/hooks/usePropertyMap';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import { MapCanvas } from './map/MapCanvas';
import { MapDialogs } from './map/MapDialogs';
import {
  AutoPlotReportPanel,
  BedLegendPanel,
  PlacePanelSlot,
  RoutePanel,
  SelectedPinPanel,
  SelectionPanel,
  StartingPointsPanel,
  VerticalLinksPanel
} from './map/MapPanels';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  map: PropertyMap | null;
  /** Where to open: a level id and a pin key from the URL (Tour Setup's View / Plot on Plan). */
  initial?: MapInitial | null;
  error?: string | null;
}

/**
 * Map & Plotting on real data: the plotting design's `mapEditor` screen —
 * building pills, floorplate tabs with their plotting progress, Auto Plot,
 * Manual Plot onto the floor SVG's polygons, the Plot Units & Amenities
 * panel — over the property's floor plates, its unit and amenity pins, and
 * the pathway graph the legacy Auto Wayfinding page edits. Everything the
 * user does here is local to the page; the only requests any button sends
 * are reads (a floor SVG, the CMS routing algorithm).
 */
export const PropertyMapScreen = ({ map, initial, error }: Props) =>
  map ? <MapEditor map={map} initial={initial ?? null} /> : <MapUnavailable error={error ?? null} />;

const MapEditor = ({ map, initial }: { map: PropertyMap; initial: MapInitial | null }) => {
  const controller = usePropertyMap(map, initial);
  const { buildings, tabs, tools, hint, planInfo, plotPanel, state, actions, level, assets, autoPlotMenu, space } = controller;
  const propId = String(map.inventory.property.id);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const measureTabs = useCallback(() => {
    const element = tabsRef.current;
    if (!element) return;
    setCanScroll({ left: element.scrollLeft > 2, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    measureTabs();
    const element = tabsRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(measureTabs);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureTabs, tabs.length]);

  const scrollTabs = (direction: -1 | 1) => tabsRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  const manualOn = state.tool === 'plot';
  const noLevel = !level;

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
          {buildings.length > 0 && (
            <div className="bo-map__buildings">
              <span className="bo-map__eyebrow">{i18n.t(M.building.label)}</span>
              <div className="bo-map__pills" role="tablist" aria-label={i18n.t(M.building.label)}>
                {buildings.map((building) => (
                  <button
                    key={building.name}
                    type="button"
                    role="tab"
                    aria-selected={building.active}
                    className={`bo-map__pill${building.active ? ' bo-map__pill--on' : ''}`}
                    onClick={() => actions.pickBuilding(building.name)}
                  >
                    {building.name}
                    <span className="bo-map__pillcount">{building.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bo-map__levelsrow">
            <button
              type="button"
              className="bo-map__levelscroll"
              aria-label={i18n.t(M.level.scrollLeft)}
              disabled={!canScroll.left}
              onClick={() => scrollTabs(-1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="bo-map__levelswrap">
              <div ref={tabsRef} className="bo-map__levels" role="tablist" aria-label={i18n.t(M.level.tabs)} onScroll={measureTabs}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.active}
                    className={`bo-map__level bo-map__level--${tab.state}${tab.active ? ' bo-map__level--active' : ''}`}
                    onClick={() => actions.pickLevel(tab.id)}
                  >
                    <span className="bo-map__levelsub">{tab.sub}</span>
                    <span className="bo-map__levellabel">{tab.label}</span>
                    <span className="bo-map__levelprogress">
                      <span className="bo-map__leveltrack">
                        <span className="bo-map__levelbar" style={{ width: `${tab.pct}%` }} />
                      </span>
                      <span className="bo-map__levelpct">{tab.progress}</span>
                    </span>
                  </button>
                ))}
              </div>
              <span className={`bo-map__levelfade bo-map__levelfade--left${canScroll.left ? ' bo-map__levelfade--on' : ''}`} aria-hidden="true" />
              <span className={`bo-map__levelfade bo-map__levelfade--right${canScroll.right ? ' bo-map__levelfade--on' : ''}`} aria-hidden="true" />
            </div>
            <button
              type="button"
              className="bo-map__levelscroll"
              aria-label={i18n.t(M.level.scrollRight)}
              disabled={!canScroll.right}
              onClick={() => scrollTabs(1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button type="button" className="bo-map__addlevel" title={i18n.t(M.building.addTitle)} onClick={actions.openFloorplateDialog}>
              <span className="bo-map__levelsub">{plural(tabs.length, M.building.plateOne, M.building.plateMany)}</span>
              <span className="bo-map__addlevellabel">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {i18n.t(M.building.addFloorplate)}
              </span>
            </button>
          </div>

          <div className="bo-map__toolbar">
            <div className="bo-map__toolbartitle">
              <span className="bo-map__toolbarlevel">{level ? `${level.sub} · ${level.label}` : (state.building ?? i18n.t(M.level.allBuildings))}</span>
              {level && <span className="bo-map__toolbarsub">{plotPanel.doneLabel}</span>}
            </div>
            <div className="bo-map__apmenu" onMouseLeave={actions.closeAutoPlotMenu}>
              <button type="button" className="bo-map__tool bo-map__tool--strong" aria-haspopup="menu" aria-expanded={state.apMenuOpen} onClick={actions.openAutoPlotMenu} disabled={noLevel}>
                {i18n.t(M.tools.autoPlot)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {state.apMenuOpen && (
                <div className="bo-map__apmenupanel" role="menu">
                  <div className="bo-map__eyebrow bo-map__apmenuhead">{i18n.t(M.autoPlot.scopeTitle)}</div>
                  {autoPlotMenu.map((item) => (
                    <button key={item.scope} type="button" role="menuitem" className="bo-map__apmenuitem" onClick={() => actions.openAutoPlot(item.scope)}>
                      <span className="bo-map__apmenulabel">{item.label}</span>
                      <span className="bo-map__apmenusub">{item.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className={`bo-map__tool bo-map__tool--strong${manualOn ? ' bo-map__tool--fill' : ''}`}
              aria-pressed={manualOn}
              onClick={actions.toggleManualPlot}
              disabled={noLevel}
            >
              {i18n.t(M.tools.manualPlot)}
              <span className="bo-map__toolpill">{i18n.t(manualOn ? M.tools.on : M.tools.off)}</span>
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
            {planInfo?.hasBoth && (
              <div className="bo-map__layers" role="tablist" aria-label={i18n.t(M.plan.layer)}>
                <button type="button" role="tab" aria-selected={space === 'svg'} className={`bo-map__planbtn bo-map__planbtn--left${space === 'svg' ? ' bo-map__planbtn--on' : ''}`} onClick={() => actions.pickLayer('svg')}>
                  {i18n.t(M.plan.layerSvg)}
                </button>
                <button type="button" role="tab" aria-selected={space === 'raster'} className={`bo-map__planbtn bo-map__planbtn--right${space === 'raster' ? ' bo-map__planbtn--on' : ''}`} onClick={() => actions.pickLayer('raster')}>
                  {i18n.t(M.plan.layerImage)}
                </button>
              </div>
            )}
            <div className="bo-map__spacer" />
            <button type="button" className="bo-map__publish" onClick={actions.openPublish}>
              {i18n.t(M.tools.publish)}
            </button>
          </div>

          <div className="bo-map__toolstrip">
            <span className="bo-map__eyebrow">{i18n.t(M.tools.pathways)}</span>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`bo-map__tool bo-map__tool--sm${tool.active ? ' bo-map__tool--active' : ''}`}
                aria-pressed={tool.active}
                onClick={() => actions.pickTool(tool.id)}
                disabled={noLevel}
              >
                <Icon name={tool.icon} />
                {tool.label}
              </button>
            ))}
            <button
              type="button"
              className={`bo-map__tool bo-map__tool--sm${state.tool === 'hallway' ? ' bo-map__tool--active' : ''}`}
              aria-pressed={state.tool === 'hallway'}
              onClick={actions.toggleHallways}
              disabled={noLevel}
            >
              <Icon name="drag" />
              {i18n.t(state.tool === 'hallway' ? M.tools.hallwayStop : M.tools.hallway)}
            </button>
            <span className="bo-map__hint" role="status">
              {hint}
            </span>
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
              {planInfo.has && (
                <button type="button" className="bo-map__planbtn bo-map__planbtn--danger" onClick={actions.clearPlan}>
                  {i18n.t(M.plan.removePlan)}
                </button>
              )}
            </div>
          )}

          {level ? (
            <MapCanvas controller={controller} />
          ) : (
            <div className="bo-map__nolevel" role="status">
              <div className="bo-map__nolevellabel">{t(M.level.none, { building: state.building ?? map.inventory.property.name })}</div>
              <button type="button" className="bo-map__tool bo-map__tool--accent" onClick={actions.openFloorplateDialog}>
                {i18n.t(M.building.addFloorplate)}
              </button>
            </div>
          )}
          {assets && !assets.svg && assets.image && level && space === 'raster' && (
            <p className="bo-map__planhint" role="note">
              {t(M.plan.imageOnlyNote, { level: `${level.sub} · ${level.label}` })}
            </p>
          )}
        </div>

        <aside className="bo-map__side">
          <PlacePanelSlot controller={controller} />
          <AutoPlotReportPanel controller={controller} />
          <SelectedPinPanel controller={controller} />
          <SelectionPanel controller={controller} />
          <StartingPointsPanel controller={controller} />
          <VerticalLinksPanel controller={controller} />
          <RoutePanel controller={controller} />
          <BedLegendPanel controller={controller} />
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
