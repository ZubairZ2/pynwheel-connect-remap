'use client';

import { createPortal } from 'react-dom';

import { i18n } from '~/resources/i18n';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { WfDetectView, WfPicker } from '~/core/utils/generator/map/wayfinding.generator';
import { M, t } from '~/core/utils/generator/map/mapText';

const W = M.wayfinding;

const Glyph = ({ d, size = 12, width = 2.4 }: { d: string; size?: number; width?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const Check = ({ on }: { on: boolean }) => (
  <span className={`bo-map__tick${on ? ' bo-map__tick--on' : ''}`} aria-hidden="true">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0 }}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  </span>
);

/**
 * The design's Wayfinding side panel for the floorplate in view: its status,
 * the stacked floor picker, the point / path / linked-stop counts from the
 * real hallway graph, the editing mode, tool hint and selection, the Detect
 * Hallways run (progress, then each floorplate's outcome), the inferred
 * points still to review, "Test shortest path" (scope, sample, From / To,
 * step-free, the route, its warnings and animation), the stops not linked
 * yet.
 */
export const WayfindingPanel = ({ controller }: { controller: PropertyMapController }) => {
  const { wayfinding } = controller;
  const panel = wayfinding.panel;
  const wf = wayfinding.actions;
  if (!panel) return null;
  const route = panel.route;

  return (
    <section className="bo-map__panel bo-map__panel--plot bo-wf" data-testid="wayfinding-panel" aria-label={i18n.t(W.title)}>
      <div className="bo-wf__scroll">
        <div className="bo-map__panelrow bo-map__panelrow--top">
          <div className="bo-map__panelhead">
            <h3 className="bo-map__paneltitle">{i18n.t(W.title)}</h3>
            <p className="bo-map__panelsub">{panel.scopeLabel}</p>
          </div>
          <StatusPill label={panel.status.label} variant={panel.status.variant} />
        </div>

        {panel.stacked && (
          <div className="bo-wf__stack" data-testid="wf-stack">
            <div className="bo-wf__stackhead">
              <span className="bo-map__eyebrow">{i18n.t(W.stack.viewing)}</span>
              <span className="bo-wf__stackdone">
                <span>{panel.stacked.doneLabel}</span>
                {panel.stacked.nextIncomplete != null && (
                  <button type="button" className="bo-wf__link" onClick={() => wf.setFloor(panel.stacked!.nextIncomplete!)}>
                    {i18n.t(W.stack.nextIncomplete)}
                  </button>
                )}
              </span>
            </div>
            <div className="bo-wf__floors" role="tablist" aria-label={i18n.t(W.stack.viewing)} style={{ gridTemplateColumns: `repeat(${panel.stacked.cols}, minmax(0, 1fr))` }}>
              {panel.stacked.floors.map((row) => (
                <button
                  key={row.floor}
                  type="button"
                  role="tab"
                  aria-selected={row.active}
                  title={row.tip}
                  className={`bo-wf__floor${row.active ? ' bo-wf__floor--on' : ''}`}
                  onClick={() => wf.setFloor(row.floor)}
                >
                  <span className="bo-wf__dot" style={{ background: row.dot }} />
                  {row.label}
                </button>
              ))}
            </div>
            <div className="bo-wf__stacknotes">
              <div>
                <span className="bo-wf__mark">—</span>
                <span>{t(W.stack.sharedPaths, { count: panel.stacked.count })}</span>
              </div>
              <div>
                <span className="bo-wf__mark">▢</span>
                <span>{t(W.stack.polygonUnit, { example: panel.stacked.unitExample })}</span>
              </div>
              <div>
                <span className="bo-wf__mark">●</span>
                <span>{i18n.t(W.stack.sharedStops)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bo-wf__counts" data-testid="wf-counts">
          <div>
            <div className="bo-wf__count">{panel.counts.points}</div>
            <div className="bo-wf__countlabel">{i18n.t(W.counts.points)}</div>
          </div>
          <div>
            <div className="bo-wf__count">{panel.counts.paths}</div>
            <div className="bo-wf__countlabel">{i18n.t(W.counts.paths)}</div>
          </div>
          <div>
            <div className="bo-wf__count">{panel.counts.linked}</div>
            <div className="bo-wf__countlabel">{i18n.t(W.counts.linked)}</div>
          </div>
        </div>

        <div className={`bo-wf__editing${panel.mode.tool ? ' bo-wf__editing--tool' : ''}`} data-testid="wf-mode" aria-label={i18n.t(W.mode.label)}>
          <span className="bo-wf__editingdot" aria-hidden="true" />
          {panel.mode.label}
        </div>
        <div className="bo-wf__hint">{panel.hint}</div>
        {panel.layerNote && <div className="bo-wf__layernote">{panel.layerNote}</div>}

        {panel.detect && <DetectCard view={panel.detect} controller={controller} />}

        {panel.pending && (
          <div className="bo-wf__pending" role="status" data-testid="wf-pending">
            <div className="bo-wf__pendingtext">{panel.pending.text}</div>
            {panel.pending.confirmable > 0 && (
              <button type="button" className="bo-wf__smallbtn" onClick={wf.confirmPending}>
                {panel.pending.confirmLabel}
              </button>
            )}
          </div>
        )}

        {panel.selection && (
          <div className="bo-wf__selection" data-testid="wf-selection">
            <div className="bo-wf__seltext">
              <div className="bo-wf__seltitle">{panel.selection.title}</div>
              <div className="bo-wf__selmeta">{panel.selection.meta}</div>
            </div>
            <button type="button" className="bo-wf__smallbtn" onClick={wf.deselect}>
              {i18n.t(W.selection.deselect)}
            </button>
            <button type="button" className="bo-wf__smallbtn bo-wf__smallbtn--danger" onClick={wf.deleteSelected}>
              {i18n.t(W.selection.delete)}
            </button>
          </div>
        )}

        <div className="bo-wf__route">
          <div className="bo-wf__routehead">
            <span className="bo-map__eyebrow">{i18n.t(W.route.title)}</span>
            <span className="bo-wf__routeacross">{i18n.t(W.route.across)}</span>
          </div>
          <div className="bo-wf__scopes" role="tablist" aria-label={i18n.t(W.route.across)} style={{ gridTemplateColumns: `repeat(${panel.scopes.length}, minmax(0, 1fr))` }}>
            {panel.scopes.map((scope) => (
              <button
                key={scope.id}
                type="button"
                role="tab"
                aria-selected={scope.active}
                title={scope.tip}
                className={`bo-wf__scope${scope.active ? ' bo-wf__scope--on' : ''}`}
                onClick={() => wf.setScope(scope.id)}
              >
                {scope.label}
              </button>
            ))}
          </div>

          {panel.sample && (
            <button type="button" className="bo-wf__sample" onClick={wf.useSample}>
              <span className="bo-wf__sampleicon">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
              </span>
              <span className="bo-wf__sampletext">
                <span className="bo-wf__sampletitle">{i18n.t(W.sample.title)}</span>
                <span className="bo-wf__samplesub">{panel.sample}</span>
              </span>
            </button>
          )}

          {panel.canRoute ? (
            <>
              <div className="bo-wf__pair" data-wf-route="1">
                <div className="bo-wf__pairrows">
                  <button type="button" className={`bo-wf__end${controller.state.wfPick?.which === 'A' ? ' bo-wf__end--open' : ''}`} onClick={wf.openPick('A')} aria-label={i18n.t(W.route.from)}>
                    <span className="bo-wf__enddot bo-wf__enddot--from" />
                    <span className="bo-wf__endtext">
                      <span className="bo-wf__endlabel">{i18n.t(W.route.from)}</span>
                      <span className="bo-wf__endname" data-testid="wf-from">
                        {panel.from.label}
                      </span>
                      <span className="bo-wf__endgroup">{panel.from.group}</span>
                    </span>
                    <Glyph d="M6 9l6 6 6-6" width={2.6} />
                  </button>
                  <button type="button" className={`bo-wf__end bo-wf__end--to${controller.state.wfPick?.which === 'B' ? ' bo-wf__end--open' : ''}`} onClick={wf.openPick('B')} aria-label={i18n.t(W.route.to)}>
                    <span className="bo-wf__enddot bo-wf__enddot--to" />
                    <span className="bo-wf__endtext">
                      <span className="bo-wf__endlabel">{i18n.t(W.route.to)}</span>
                      <span className="bo-wf__endname" data-testid="wf-to">
                        {panel.to.label}
                      </span>
                      <span className="bo-wf__endgroup">{panel.to.group}</span>
                    </span>
                    <Glyph d="M6 9l6 6 6-6" width={2.6} />
                  </button>
                </div>
                <button type="button" className="bo-wf__swap" title={i18n.t(W.route.swap)} aria-label={i18n.t(W.route.swap)} onClick={wf.swap}>
                  <Glyph d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" size={14} width={2.2} />
                </button>
              </div>
              {panel.picker && <RoutePicker picker={panel.picker} controller={controller} />}

              {panel.multiScope && (
                <button type="button" className="bo-wf__check" role="checkbox" aria-checked={panel.stepFree} onClick={wf.toggleStepFree}>
                  <Check on={panel.stepFree} />
                  <span>
                    {i18n.t(W.route.stepFree)} <span className="bo-wf__subtle">· {i18n.t(W.route.stepFreeSub)}</span>
                  </span>
                </button>
              )}
              <button type="button" className="bo-wf__find" onClick={wf.findRoute}>
                {i18n.t(W.route.find)}
              </button>

              {route && !route.ok && (
                <div className="bo-wf__error" role="alert" data-testid="wf-route-error">
                  <div className="bo-wf__errortitle">{route.title}</div>
                  <div className="bo-wf__errortext">{route.error}</div>
                  {route.fixLabel && (
                    <button type="button" className="bo-wf__fix" onClick={wf.routeFix}>
                      {route.fixLabel}
                    </button>
                  )}
                </div>
              )}

              {route && route.ok && (
                <div className="bo-wf__result" data-testid="wf-route">
                  <div className="bo-wf__resulthead">
                    <div className="bo-wf__resulttitle">{route.title}</div>
                    <div className="bo-wf__resultsub">{route.sub}</div>
                  </div>
                  {route.warnings.map((warning) => (
                    <div key={warning} className="bo-wf__warning" data-testid="wf-route-warning">
                      {warning}
                    </div>
                  ))}
                  <div className="bo-wf__anim">
                    <span className="bo-map__eyebrow">{i18n.t(W.anim.title)}</span>
                    <div className="bo-wf__animmodes" role="radiogroup" aria-label={i18n.t(W.anim.title)}>
                      {(
                        [
                          ['point', W.anim.point, W.anim.pointSub],
                          ['stop', W.anim.stop, W.anim.stopSub]
                        ] as const
                      ).map(([id, label, sub]) => (
                        <button key={id} type="button" role="radio" aria-checked={route.anim.mode === id} className="bo-wf__animmode" onClick={() => wf.setAnimMode(id)}>
                          <Check on={route.anim.mode === id} />
                          <span className="bo-wf__animtext">
                            <span className="bo-wf__animlabel">{i18n.t(label)}</span>
                            <span className="bo-wf__animsub">{i18n.t(sub)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="bo-wf__animbtns">
                      <button type="button" className="bo-wf__play" onClick={wf.animPlay}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={route.anim.playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z'} />
                        </svg>
                        {route.anim.playLabel}
                      </button>
                      <button type="button" className="bo-wf__animstop" onClick={wf.animStop} disabled={route.anim.idle} title={i18n.t(W.anim.stopTitle)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <rect x="5" y="5" width="14" height="14" rx="2" />
                        </svg>
                        {i18n.t(W.anim.stopLabel)}
                      </button>
                    </div>
                    {route.anim.status && <div className="bo-wf__animstatus">{route.anim.status}</div>}
                  </div>
                  <div className="bo-wf__steps">
                    {route.steps.map((step) => (
                      <button
                        key={step.key}
                        type="button"
                        className={`bo-wf__step${step.active ? ' bo-wf__step--active' : step.here ? ' bo-wf__step--here' : ''}`}
                        disabled={!step.clickable}
                        onClick={() => wf.viewStep(step.ck)}
                      >
                        <span className="bo-wf__stepicon" style={{ background: step.iconBg, color: step.iconColor }}>
                          <Glyph d={step.d} />
                        </span>
                        <span className="bo-wf__steptext">
                          <span className="bo-wf__steptitle">{step.title}</span>
                          <span className="bo-wf__stepsub">{step.sub}</span>
                        </span>
                        {step.tag && (
                          <span className="bo-wf__steptag" style={{ color: step.tagColor }}>
                            {step.tag}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bo-wf__noroute">{panel.noRouteText}</div>
          )}
        </div>

        {panel.unlinked && (
          <div className="bo-wf__unlinked" data-testid="wf-unlinked">
            <div className="bo-map__eyebrow">{panel.unlinked.head}</div>
            <div className="bo-wf__unlinkedhint">{i18n.t(W.unlinked.hint)}</div>
            {panel.unlinked.rows.map((row) => (
              <div key={row.key} className="bo-wf__unlinkedrow" data-testid="wf-unlinked-row">
                <span className="bo-wf__unlinkeddot" />
                <div className="bo-wf__unlinkedtext">
                  <div className="bo-wf__unlinkedname">{row.name}</div>
                  <div className="bo-wf__unlinkedmeta">{row.meta}</div>
                  {row.link && (
                    <button type="button" className="bo-wf__smallbtn bo-wf__unlinkedlink" onClick={() => wf.linkListed(row.key)}>
                      {row.link}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bo-wf__footnote">{i18n.t(W.footnote)}</div>
      </div>
    </section>
  );
};

/** Detect Hallways: a progress bar and the floorplate being read while it runs; then the counts and every floorplate's outcome, with Undo. */
const DetectCard = ({ view, controller }: { view: WfDetectView; controller: PropertyMapController }) => {
  const wf = controller.wayfinding.actions;
  return (
    <div className={`bo-wf__detect${view.running ? ' bo-wf__detect--running' : ''}`} role="status" aria-live="polite" data-testid="wf-detect">
      <div className="bo-wf__detecthead">
        <div className="bo-wf__reviewtitle" data-testid="wf-detect-title">
          {view.title}
        </div>
        <div className="bo-wf__reviewactions">
          {view.running ? (
            <button type="button" className="bo-wf__smallbtn" onClick={wf.stopDetect}>
              {i18n.t(W.detect.stop)}
            </button>
          ) : (
            <>
              {view.canUndo && (
                <button type="button" className="bo-wf__smallbtn" onClick={wf.undoDetect}>
                  {i18n.t(W.review.undo)}
                </button>
              )}
              <button type="button" className="bo-wf__smallbtn" onClick={wf.dismissReview}>
                {i18n.t(W.review.dismiss)}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="bo-wf__progress" aria-hidden={!view.running}>
        <span className="bo-wf__progressbar" style={{ width: `${view.pct}%` }} />
      </div>
      {view.current && <div className="bo-wf__detectnow">{view.current}</div>}
      <div className="bo-wf__detectsum">
        {view.summary.map((row) => (
          <span key={row.label} className={`bo-wf__detectchip bo-wf__detectchip--${row.tone}`}>
            <b>{row.value}</b> {row.label}
          </span>
        ))}
      </div>
      {view.empty && <div className="bo-wf__reviewbody">{view.empty}</div>}
      <div className="bo-wf__detectrows" data-testid="wf-detect-rows">
        {view.rows.map((row) => (
          <div key={row.levelId} className="bo-wf__detectrow" data-status={row.status}>
            <span className={`bo-wf__detectdot bo-wf__detectdot--${row.tone}`} aria-hidden="true" />
            <span className="bo-wf__detectname">{row.name}</span>
            <span className={`bo-wf__detectstatus bo-wf__detectstatus--${row.tone}`}>{row.label}</span>
            {row.detail && <span className="bo-wf__detectdetail">{row.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

/** The From / To picker: search, kind chips, results grouped by floor, ↑ ↓ Enter Esc. Fixed to the viewport, so the panel's scroll never clips it. */
const RoutePicker = ({ picker, controller }: { picker: WfPicker; controller: PropertyMapController }) => {
  const wf = controller.wayfinding.actions;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      <div className="bo-wf__pickveil" onClick={wf.closePick} />
      <div
        className="bo-wf__pick"
        data-wf-pick="1"
        role="dialog"
        aria-label={picker.title}
        style={{
          left: picker.pos.left,
          width: picker.pos.width,
          top: picker.pos.top ?? 'auto',
          bottom: picker.pos.bottom ?? 'auto'
        }}
      >
        <div className="bo-wf__pickhead">
          <div className="bo-wf__picktitle">
            <span>{picker.title}</span>
            <span className="bo-wf__pickcount">{picker.count}</span>
          </div>
          <div className="bo-wf__picksearch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              autoFocus
              value={picker.query}
              placeholder={i18n.t(W.picker.placeholder)}
              aria-label={i18n.t(W.picker.placeholder)}
              onChange={(event) => wf.setPickQuery(event.target.value)}
              onKeyDown={(event) => wf.pickKey(event, picker.order)}
            />
          </div>
          <div className="bo-wf__pickkinds">
            {picker.kinds.map((kind) => (
              <button key={kind.id} type="button" className={`bo-wf__pickkind${kind.active ? ' bo-wf__pickkind--on' : ''}`} onClick={() => wf.setPickKind(kind.id)}>
                {kind.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bo-wf__picklist" style={{ maxHeight: picker.pos.listH }} role="listbox">
          {picker.groups.map((group) => (
            <div key={group.label}>
              <div className="bo-wf__pickgroup">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.chosen}
                  className={`bo-wf__pickitem${item.active ? ' bo-wf__pickitem--active' : item.chosen ? ' bo-wf__pickitem--chosen' : ''}`}
                  onMouseEnter={() => wf.setPickIndex(picker.order.indexOf(item.id))}
                  onClick={() => wf.choose(item.id)}
                >
                  <span className="bo-wf__pickicon" style={{ background: item.iconBg, color: item.iconColor }}>
                    <Glyph d={item.d} size={11} />
                  </span>
                  <span className="bo-wf__picktext">
                    <span className="bo-wf__pickname">{item.label}</span>
                    <span className="bo-wf__pickmeta">{item.meta}</span>
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bo-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: item.chosen ? 1 : 0, flexShrink: 0 }} aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </button>
              ))}
            </div>
          ))}
          {picker.empty && <div className="bo-wf__pickempty">{picker.empty}</div>}
        </div>
        <div className="bo-wf__pickfoot">{i18n.t(W.picker.keys)}</div>
      </div>
    </>,
    document.body
  );
};
