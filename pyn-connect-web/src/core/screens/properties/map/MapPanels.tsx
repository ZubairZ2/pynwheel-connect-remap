'use client';

import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { PlotListItem } from '~/core/utils/generator/map/mapPanels.generator';
import { M, t } from '~/core/utils/generator/map/mapText';

/** The design's right-hand column: one panel per section, all read from the controller. */

const Tick = ({ on, danger }: { on: boolean; danger?: boolean }) => (
  <span className={`bo-map__tick${on ? (danger ? ' bo-map__tick--danger' : ' bo-map__tick--on') : ''}`} aria-hidden="true">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0 }}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  </span>
);

const ListRow = ({ item, danger, onToggle, action }: { item: PlotListItem; danger?: boolean; onToggle: () => void; action?: React.ReactNode }) => (
  <div className={`bo-map__plotrow${item.ticked ? (danger ? ' bo-map__plotrow--danger' : ' bo-map__plotrow--on') : ''}`}>
    <button type="button" className="bo-map__plotpick" onClick={onToggle} aria-pressed={item.ticked} aria-label={item.label}>
      <Tick on={item.ticked} danger={danger} />
      <span className="bo-map__plottext">
        <span className="bo-map__plotname">{item.label}</span>
        <span className="bo-map__plotmeta">{item.meta}</span>
      </span>
    </button>
    {action}
  </div>
);

/**
 * "Plot Units & Amenities": the level's items to plot and the ones already
 * plotted, as the design lays them out — search, two tabs, tick boxes,
 * Unplot. Ticking is local; dropping happens on the canvas.
 */
export const PlotPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { plotPanel, state, actions } = controller;
  const todoTab = state.plotTab !== 'done';

  return (
    <section className="bo-map__panel bo-map__panel--plot" data-testid="plot-panel">
      <div>
        <div className="bo-map__panelrow">
          <h3 className="bo-map__paneltitle">{i18n.t(M.place.title)}</h3>
          <span className="bo-map__accent">{plotPanel.doneLabel}</span>
        </div>
        <p className="bo-map__panelsub">{plotPanel.scopeLabel}</p>
      </div>
      <div className="bo-map__plotsearch">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={state.plotQuery}
          aria-label={i18n.t(M.place.search)}
          placeholder={i18n.t(M.place.search)}
          onChange={(event) => actions.setPlotQuery(event.target.value)}
        />
      </div>
      <div className="bo-map__plottabs" role="tablist">
        <button type="button" role="tab" aria-selected={todoTab} className={`bo-map__plottab${todoTab ? ' bo-map__plottab--on' : ''}`} onClick={() => actions.setPlotTab('todo')}>
          {i18n.t(M.place.toPlot)}
          <span>{plotPanel.todoTotal}</span>
        </button>
        <button type="button" role="tab" aria-selected={!todoTab} className={`bo-map__plottab${!todoTab ? ' bo-map__plottab--on' : ''}`} onClick={() => actions.setPlotTab('done')}>
          {i18n.t(M.place.plotted)}
          <span>{plotPanel.doneTotal}</span>
        </button>
      </div>

      {todoTab ? (
        <div className="bo-map__plotbody">
          <div className="bo-map__plotall">
            <button
              type="button"
              className="bo-map__plotpick bo-map__plotpick--all"
              aria-pressed={plotPanel.allTodoTicked}
              onClick={() =>
                actions.setPlotSel(
                  plotPanel.allTodoTicked
                    ? state.plotSel.filter((key) => !plotPanel.todo.some((item) => item.key === key))
                    : [...new Set([...state.plotSel, ...plotPanel.todo.map((item) => item.key)])]
                )
              }
            >
              <Tick on={plotPanel.allTodoTicked} />
              <span className="bo-map__plotalllabel">{plotPanel.selCountLabel}</span>
            </button>
            {state.plotSel.length > 0 && (
              <button type="button" className="bo-map__plotclear" onClick={() => actions.setPlotSel([])}>
                {i18n.t(M.place.clear)}
              </button>
            )}
          </div>
          <div className="bo-map__plotlist">
            {plotPanel.todo.map((item) => (
              <ListRow key={item.key} item={item} onToggle={() => actions.togglePlotSel(item.key)} />
            ))}
            {plotPanel.todo.length === 0 && <div className="bo-map__empty">{plotPanel.todoEmptyLabel}</div>}
          </div>
          {plotPanel.hint && <div className="bo-map__plothint">{plotPanel.hint}</div>}
        </div>
      ) : (
        <div className="bo-map__plotbody">
          <div className="bo-map__plotall">
            <button
              type="button"
              className="bo-map__plotpick bo-map__plotpick--all"
              aria-pressed={plotPanel.allDoneTicked}
              onClick={() =>
                actions.setUnSel(
                  plotPanel.allDoneTicked
                    ? state.plotUnSel.filter((key) => !plotPanel.done.some((item) => item.key === key))
                    : [...new Set([...state.plotUnSel, ...plotPanel.done.map((item) => item.key)])]
                )
              }
            >
              <Tick on={plotPanel.allDoneTicked} danger />
              <span className="bo-map__plotalllabel">{plotPanel.unSelLabel}</span>
            </button>
            {state.plotUnSel.length > 0 && (
              <button type="button" className="bo-map__plotclear" onClick={() => actions.setUnSel([])}>
                {i18n.t(M.place.clear)}
              </button>
            )}
          </div>
          <div className="bo-map__plotlist">
            {plotPanel.done.map((item) => (
              <ListRow
                key={item.key}
                item={item}
                danger
                onToggle={() => actions.toggleUnSel(item.key)}
                action={
                  <button type="button" className="bo-map__unplot" title={i18n.t(M.place.unplotTitleShort)} onClick={() => actions.unplotItems([item.key])}>
                    {i18n.t(M.place.unplot)}
                  </button>
                }
              />
            ))}
            {plotPanel.done.length === 0 && <div className="bo-map__empty">{plotPanel.doneEmptyLabel}</div>}
          </div>
          {state.plotUnSel.length > 0 && (
            <button type="button" className="bo-map__wide bo-map__wide--dangerfill" onClick={actions.unplotMany}>
              {plotPanel.unplotManyLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

/** The plot panel under the name the screen imports it by. */
export const PlacePanelSlot = PlotPanel;

export const AutoPlotReportPanel = ({ controller }: { controller: PropertyMapController }) => {
  const report = controller.state.autoPlotReport;
  if (!report) return null;
  return (
    <section className="bo-map__panel">
      <div className="bo-map__panelrow bo-map__panelrow--top">
        <div>
          <h3 className="bo-map__paneltitle">{i18n.t(M.autoPlot.title)}</h3>
          <p className="bo-map__panelsub">{t(M.autoPlot.headline, { count: report.placed })}</p>
        </div>
        <button type="button" className="bo-map__dismiss" aria-label={i18n.t(M.autoPlot.dismiss)} onClick={controller.actions.dismissAutoPlot}>
          ×
        </button>
      </div>
      <div className="bo-map__stats">
        <div className="bo-map__stat">
          <div className="bo-map__statvalue bo-map__statvalue--ok">{report.placed}</div>
          <div className="bo-map__statlabel">{i18n.t(M.autoPlot.placed)}</div>
        </div>
        <div className="bo-map__stat">
          <div className="bo-map__statvalue bo-map__statvalue--warn">{report.skipped.length}</div>
          <div className="bo-map__statlabel">{i18n.t(M.autoPlot.notPlaced)}</div>
        </div>
      </div>
      {report.skipped.length > 0 && (
        <div className="bo-map__warnbox bo-map__warnbox--list">
          {report.skipped.slice(0, 12).map((row, index) => (
            <div key={`${row.name}-${index}`}>
              <div className="bo-map__warnname">{row.name}</div>
              <div className="bo-map__warnreason">{row.reason}</div>
            </div>
          ))}
          {report.skipped.length > 12 && <div className="bo-map__warnreason">{t(M.autoPlot.more, { count: report.skipped.length - 12 })}</div>}
        </div>
      )}
    </section>
  );
};

export const SelectedPinPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { selectedPin, actions } = controller;
  if (!selectedPin) return null;
  return (
    <section className="bo-map__panel bo-map__panel--accent">
      <div className="bo-map__pinhead">
        <span className="bo-map__swatchdot" style={{ background: selectedPin.color }} />
        <h3 className="bo-map__paneltitle">{selectedPin.name}</h3>
      </div>
      <p className="bo-map__panelsub">{selectedPin.meta}</p>
      <p className="bo-map__panelnote">{selectedPin.coordLabel}</p>
      {(selectedPin.temporary || selectedPin.moved) && <p className="bo-map__panelnote bo-map__panelnote--temp">{i18n.t(M.pin.temporary)}</p>}
      <div className="bo-map__stack">
        {!selectedPin.onThisLevel && (
          <button type="button" className="bo-map__wide" onClick={actions.movePinHere}>
            {i18n.t(M.pin.moveHere)}
          </button>
        )}
        <button type="button" className="bo-map__wide bo-map__wide--danger" onClick={actions.removePin}>
          {i18n.t(M.pin.remove)}
        </button>
      </div>
    </section>
  );
};

export const StartingPointsPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { startPoints } = controller;
  return (
    <section className="bo-map__panel">
      <h3 className="bo-map__paneltitle">{i18n.t(M.starts.title)}</h3>
      <p className="bo-map__panelsub">{i18n.t(M.starts.subtitle)}</p>
      {startPoints.rows.map((row) => (
        <div key={row.building} className="bo-map__listrow">
          <div className="bo-map__listtext">
            <div className="bo-map__listtitle">{row.building}</div>
            <div className="bo-map__listsub">{row.name}</div>
          </div>
          <StatusPill variant={row.variant} label={row.state} />
        </div>
      ))}
      {startPoints.missing && <div className="bo-map__warnbox">{i18n.t(M.starts.missing)}</div>}
    </section>
  );
};

export const SelectionPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { selection, actions, space } = controller;
  return (
    <section className="bo-map__panel">
      <h3 className="bo-map__paneltitle">{i18n.t(M.selection.title)}</h3>
      {selection ? (
        <div className="bo-map__stack">
          <input
            className="bo-field"
            value={selection.label}
            readOnly={!selection.editable}
            aria-label={selection.kind === 'node' ? i18n.t(M.selection.hallway) : i18n.t(M.selection.edge)}
            onChange={(event) => actions.renameSelected(event.target.value)}
          />
          <p className="bo-map__panelsub">{selection.meta}</p>
          <p className={`bo-map__panelnote${selection.temporary ? ' bo-map__panelnote--temp' : ''}`}>{selection.state}</p>
          {selection.chainFrom && <p className="bo-map__panelnote">{i18n.t(M.selection.chainFrom)}</p>}
          {selection.canSetStart && (
            <button type="button" className="bo-map__wide" onClick={actions.setStartPoint}>
              {i18n.t(M.selection.setStart)}
            </button>
          )}
          <button type="button" className="bo-map__wide bo-map__wide--danger" onClick={actions.deleteSelected}>
            {selection.deleteLabel}
          </button>
          {!selection.temporary && <p className="bo-map__panelnote">{i18n.t(M.selection.storedNoDelete)}</p>}
        </div>
      ) : (
        <p className="bo-map__help">
          {i18n.t(space === 'svg' ? M.selection.helpIntroSvg : M.selection.helpIntro)} <b>{i18n.t(M.tools.plot)}</b> {i18n.t(M.selection.helpPlot)}{' '}
          <b>{i18n.t(M.tools.junction)}</b> {i18n.t(M.selection.helpJunction)} <b>{i18n.t(M.tools.edge)}</b> {i18n.t(M.selection.helpEdge)}{' '}
          <b>{i18n.t(M.tools.move)}</b> {i18n.t(M.selection.helpMove)}
        </p>
      )}
    </section>
  );
};

export const BedLegendPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { bedLegend, actions, map } = controller;
  const settings = map.graph.settings;
  return (
    <section className="bo-map__panel">
      <h3 className="bo-map__paneltitle">{i18n.t(M.legend.title)}</h3>
      <p className="bo-map__panelsub">{i18n.t(M.legend.subtitle)}</p>
      {bedLegend.map((tier) => (
        <div key={tier.id} className="bo-map__tier">
          <div className="bo-map__tierhead">
            <span className="bo-map__swatchdot bo-map__swatchdot--sm" style={{ background: tier.color }} />
            <span className="bo-map__tierlabel">{tier.label}</span>
          </div>
          <div className="bo-map__swatches">
            {tier.swatches.map((swatch) => (
              <button
                key={swatch.color}
                type="button"
                className={`bo-map__swatch${swatch.active ? ' bo-map__swatch--active' : ''}`}
                style={{ background: swatch.color }}
                aria-label={`${tier.label} ${swatch.color}`}
                aria-pressed={swatch.active}
                onClick={() => actions.setBedColor(tier.id, swatch.color)}
              />
            ))}
          </div>
        </div>
      ))}
      {(settings.availableUnitsColor || settings.modelUnitsColor || settings.amenitiesColor) && (
        <p className="bo-map__panelnote">
          {t(M.legend.cmsColors, {
            available: settings.availableUnitsColor ?? '—',
            model: settings.modelUnitsColor ?? '—',
            amenity: settings.amenitiesColor ?? '—'
          })}
        </p>
      )}
    </section>
  );
};

export const VerticalLinksPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { verticalLinks } = controller;
  if (!verticalLinks.length) return null;
  return (
    <section className="bo-map__panel">
      <h3 className="bo-map__paneltitle">{i18n.t(M.vertical.title)}</h3>
      <p className="bo-map__panelsub">{i18n.t(M.vertical.subtitle)}</p>
      {verticalLinks.map((link, index) => (
        <div key={`${link.from}-${link.to}-${index}`} className="bo-map__listrow bo-map__listrow--stack">
          <div className="bo-map__listtitle">
            {link.from} ↔ {link.to}
          </div>
          <div className={`bo-map__listsub${link.temporary ? ' bo-map__panelnote--temp' : ''}`}>{link.kind}</div>
        </div>
      ))}
    </section>
  );
};

export const RoutePanel = ({ controller }: { controller: PropertyMapController }) => {
  const { state, actions, map, levels } = controller;
  const route = state.route;
  const running = route?.status === 'running';
  const total = route?.legs.reduce((sum, leg) => sum + leg.points.length, 0) ?? 0;
  const legLabel = (leg: { floor: number | null; building: string | null }) =>
    leg.floor == null ? i18n.t(M.route.legSitemap) : `${leg.building ? `${leg.building} · ` : ''}${t(M.route.leg, { floor: leg.floor })}`;

  return (
    <section className="bo-map__panel">
      <h3 className="bo-map__paneltitle">{i18n.t(M.route.title)}</h3>
      <p className="bo-map__panelsub">{i18n.t(M.route.subtitle)}</p>
      {!map.graph.settings.autoWayfinding && <p className="bo-map__panelnote">{i18n.t(M.route.disabled)}</p>}
      <div className="bo-map__stack">
        <button type="button" className="bo-map__wide bo-map__wide--accent" onClick={actions.runCmsRoute} disabled={running}>
          <Icon name="play" style={{ marginRight: 6 }} />
          {i18n.t(running && route?.source === 'cms' ? M.route.running : M.route.runCms)}
        </button>
        <p className="bo-map__panelnote">{i18n.t(M.route.cmsNote)}</p>
        <button type="button" className="bo-map__wide" onClick={actions.runLocalRoute} disabled={running}>
          {i18n.t(M.route.runLocal)}
        </button>
        <p className="bo-map__panelnote">{i18n.t(M.route.localNote)}</p>
      </div>
      {running && <LoadingIndicator variant="inline" label={i18n.t(M.route.running)} className="bo-map__routebusy" />}
      {route && route.status !== 'running' && (
        <div className="bo-map__routeresult" role="status">
          {route.status === 'failed' && <div className="bo-map__warnbox">{i18n.t(M.route.failed)}</div>}
          {route.status === 'unauthorized' && <div className="bo-map__warnbox">{i18n.t(M.route.unauthorized)}</div>}
          {route.status === 'empty' && (
            <div className="bo-map__warnbox">{i18n.t(route.source === 'local' ? M.route.localEmpty : M.route.empty)}</div>
          )}
          {route.status === 'done' && (
            <>
              <div className="bo-map__listtitle">
                {i18n.t(route.source === 'cms' ? M.route.sourceCms : M.route.sourceLocal)} ·{' '}
                {t(M.route.summary, { legs: route.legs.length, points: total })} · {Math.min(route.revealed, total)}/{total}
              </div>
              <ol className="bo-map__legs">
                {route.legs.map((leg, index) => (
                  <li key={index} className="bo-map__leg">
                    <button
                      type="button"
                      className="bo-map__leglink"
                      onClick={() => {
                        const target = leg.floor == null ? levels[0] : levels.find((level) => level.floors.includes(leg.floor!));
                        if (target) {
                          actions.pickLevel(target.id);
                          actions.pickLayer('raster');
                        }
                      }}
                    >
                      {legLabel(leg)}
                    </button>{' '}
                    <span className="bo-map__listsub">{leg.points.length} pts</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <button type="button" className="bo-map__wide bo-map__wide--sm" onClick={actions.clearRoute}>
            {i18n.t(M.route.clear)}
          </button>
        </div>
      )}
    </section>
  );
};
