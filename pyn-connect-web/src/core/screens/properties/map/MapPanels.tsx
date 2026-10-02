'use client';

import { i18n } from '~/resources/i18n';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { PlotListItem } from '~/core/utils/generator/map/mapPanels.generator';
import { M } from '~/core/utils/generator/map/mapText';

/** The design's right-hand column while plotting: the Plot on Map panel, read from the controller. */

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
 * "Plot on Map": the level's units, amenities and (self-tour) Additional
 * Stops to plot and the ones already plotted, as the wayfinding design lays
 * them out — Add Stop, the stacked floor, Show, search, two tabs, tick
 * boxes, Unplot. Ticking is local; dropping happens on the canvas.
 */
export const PlotPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { plotPanel, state, actions, wayfinding } = controller;
  const todoTab = state.plotTab !== 'done';
  const wf = wayfinding.actions;

  return (
    <section className="bo-map__panel bo-map__panel--plot" data-testid="plot-panel">
      <div className="bo-map__panelrow bo-map__panelrow--top">
        <div className="bo-map__panelhead">
          <h3 className="bo-map__paneltitle">{i18n.t(M.place.title)}</h3>
          <p className="bo-map__panelsub">
            {plotPanel.scopeLabel} · <span className="bo-map__accent">{plotPanel.doneLabel}</span>
          </p>
        </div>
        {plotPanel.showAddStop && (
          <button type="button" className="bo-map__addstop" title={i18n.t(M.stops.addTitle)} onClick={() => wf.openStopDialog()}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {i18n.t(M.stops.add)}
          </button>
        )}
      </div>

      {plotPanel.floorOptions && (
        <label className="bo-map__selectrow">
          <span className="bo-map__selectlabel">{i18n.t(M.show.floor)}</span>
          <select value={plotPanel.floorValue} onChange={(event) => wf.setPlotFloor(event.target.value)} aria-label={i18n.t(M.show.floor)}>
            {plotPanel.floorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="bo-map__show" onMouseLeave={() => wf.setPlotShowOpen(false)}>
        <button
          type="button"
          className={`bo-map__showbtn${state.plotShowOpen ? ' bo-map__showbtn--open' : ''}`}
          aria-haspopup="true"
          aria-expanded={state.plotShowOpen}
          onClick={() => wf.setPlotShowOpen(!state.plotShowOpen)}
        >
          <span className="bo-map__selectlabel">{i18n.t(M.show.label)}</span>
          <span className="bo-map__showsummary">{plotPanel.showSummary}</span>
          {plotPanel.showPending && <span className="bo-map__showpending">{plotPanel.showPending}</span>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bo-muted)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transform: state.plotShowOpen ? 'rotate(180deg)' : 'none' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {state.plotShowOpen && (
          <div className="bo-map__showmenu" role="menu">
            <div className="bo-map__eyebrow bo-map__showhead">{i18n.t(M.show.title)}</div>
            {plotPanel.show.map((option) => (
              <button key={option.kind} type="button" role="menuitemcheckbox" aria-checked={option.on} className="bo-map__showitem" onClick={() => wf.togglePlotShow(option.kind)}>
                <Tick on={option.on} />
                <span className="bo-map__showtext">
                  <span className="bo-map__showname">{option.label}</span>
                  <span className="bo-map__showdesc">{option.desc}</span>
                </span>
                <span className={`bo-map__showbadge bo-map__showbadge--${option.badgeTone}`}>{option.badge}</span>
              </button>
            ))}
          </div>
        )}
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
            {plotPanel.todo.length === 0 && (
              <div className="bo-map__empty bo-map__empty--stack">
                <span>{plotPanel.todoEmptyLabel}</span>
                {plotPanel.emptyAddStop && (
                  <>
                    <button type="button" className="bo-map__tool bo-map__tool--accent bo-map__tool--sm" onClick={() => wf.openStopDialog()}>
                      {i18n.t(M.stops.addA)}
                    </button>
                    <span className="bo-map__emptynote">{i18n.t(M.stops.addNote)}</span>
                  </>
                )}
              </div>
            )}
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
