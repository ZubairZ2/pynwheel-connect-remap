'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { propRoute, tourContentRoute, tourSetupRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { HoverMenu } from '~/core/components/molecules/HoverMenu';
import { usePropertyMap, type MapInitial } from '~/core/hooks/usePropertyMap';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import { MapCanvas } from './map/MapCanvas';
import { MapDialogs } from './map/MapDialogs';
import { PlotPanel } from './map/MapPanels';
import { WayfindingPanel } from './map/WayfindingPanel';
import { ModeSwitch, WayfindingToolbar } from './map/WayfindingToolbar';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  map: PropertyMap | null;
  /** Where to open: a level id and a pin key from the URL (Tour Setup's View / Plot on Plan). */
  initial?: MapInitial | null;
  error?: string | null;
}

/**
 * Map & Plotting on real data, as the wayfinding design's `mapEditor` screen
 * lays it out: building pills, floorplate tabs with their progress, and —
 * for a self-tour property — the Plotting / Wayfinding switch. Plotting:
 * "{floor} · n of m plotted" with Auto Plot and Manual Plot, the floor plan
 * with its polygons and pins, and the Plot on Map panel. Wayfinding: Detect
 * Paths, the path tools and the Wayfinding panel over the stored hallway
 * graph, on the same canvas. Everything the user does here is local to the
 * page; the only requests it sends are reads (a floor SVG).
 */
export const PropertyMapScreen = ({ map, initial, error }: Props) =>
  map ? <MapEditor map={map} initial={initial ?? null} /> : <MapUnavailable error={error ?? null} />;

const MapEditor = ({ map, initial }: { map: PropertyMap; initial: MapInitial | null }) => {
  const controller = usePropertyMap(map, initial);
  const { buildings, tabs, plotPanel, state, actions, level, autoPlotMenu, wayfinding } = controller;
  const wayfind = wayfinding.wayfind && !!wayfinding.toolbar;
  const propId = String(map.inventory.property.id);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  // Which arrow can still move the strip. Only a changed answer reaches state,
  // so the scroll events of a smooth scroll do not re-render the editor.
  const measureTabs = useCallback(() => {
    const element = tabsRef.current;
    if (!element) return;
    const next = { left: element.scrollLeft > 2, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 };
    setCanScroll((current) => (current.left === next.left && current.right === next.right ? current : next));
  }, []);

  useEffect(() => {
    measureTabs();
    const element = tabsRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(measureTabs);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureTabs, tabs.length]);

  // The selected floorplate stays in view: a deep link (`?level=`) or a pick
  // from Tour Setup may land on a tab far along the strip.
  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [state.levelId]);

  // One page of tabs per click: what the strip shows, less one tab so the last visible tab stays as the anchor.
  const scrollTabs = (direction: -1 | 1) => {
    const element = tabsRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(element.clientWidth - 120, 160), behavior: 'smooth' });
  };
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

      <div className="bo-map__layout">
        <div className="bo-map__main">
          {/* The Building row is a choice: it shows only when the property's map is split across several buildings. */}
          {buildings.length > 1 && (
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
                    onClick={() => !building.active && actions.pickBuilding(building.name)}
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
            {/* | switch | text (wraps) | actions |: the text grows and wraps between the switch and the fixed action area. */}
            <div className="bo-map__toolbartitle">
              <ModeSwitch controller={controller} />
              <div className="bo-map__toolbartext">
                <span className="bo-map__toolbarlevel">{level ? `${level.sub} · ${level.label}` : (state.building ?? i18n.t(M.level.allBuildings))}</span>
                {level && <span className="bo-map__toolbarsub">{wayfind ? wayfinding.toolbar!.sub : plotPanel.doneLabel}</span>}
              </div>
            </div>
            <div className="bo-map__toolbaractions">
            <button
              type="button"
              className={`bo-map__tool bo-map__tool--accent${wayfinding.unsaved ? ' bo-map__tool--fill' : ''}`}
              onClick={() => void wayfinding.actions.save()}
              disabled={noLevel || wayfinding.saving || !wayfinding.unsaved}
              title={wayfinding.canSave ? i18n.t(M.wayfinding.save.note) : i18n.t(map.write.writesEnabled ? M.wayfinding.save.notAllowed : M.wayfinding.save.disabled)}
              data-testid="map-save"
            >
              {wayfinding.saving ? i18n.t(M.wayfinding.save.saving) : wayfinding.unsaved ? t(M.wayfinding.save.buttonCount, { count: wayfinding.unsaved }) : i18n.t(M.wayfinding.save.button)}
            </button>
            {wayfind ? (
              <WayfindingToolbar controller={controller} />
            ) : (
              <>
            <HoverMenu
              className="bo-map__apmenu"
              open={state.apMenuOpen}
              onClose={actions.closeAutoPlotMenu}
              panelClassName="bo-map__apmenupanel"
              trigger={
                <button type="button" className="bo-map__tool bo-map__tool--strong" aria-haspopup="menu" aria-expanded={state.apMenuOpen} onClick={actions.openAutoPlotMenu} disabled={noLevel}>
                  {i18n.t(M.tools.autoPlot)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              }
            >
              <div className="bo-map__eyebrow bo-map__apmenuhead">{i18n.t(M.autoPlot.scopeTitle)}</div>
              {autoPlotMenu.map((item) => (
                <button key={item.scope} type="button" role="menuitem" className="bo-map__apmenuitem" onClick={() => actions.openAutoPlot(item.scope)}>
                  <span className="bo-map__apmenulabel">{item.label}</span>
                  <span className="bo-map__apmenusub">{item.sub}</span>
                </button>
              ))}
            </HoverMenu>
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
              </>
            )}
            </div>
          </div>

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
        </div>

        <aside className="bo-map__side">{wayfind ? <WayfindingPanel controller={controller} /> : <PlotPanel controller={controller} />}</aside>
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
