'use client';

import { useState } from 'react';

import { i18n } from '~/resources/i18n';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import { M } from '~/core/utils/generator/map/mapText';

const W = M.wayfinding;

/**
 * The toolbar's right-hand side in Wayfinding mode: Detect Hallways ▾ (this
 * floorplate / its building's / all; it auto-connects as part of the run),
 * the four tools — each toggles, and with none on the POC's own gestures
 * apply — Undo, and Clear Paths.
 */
export const WayfindingToolbar = ({ controller }: { controller: PropertyMapController }) => {
  const { wayfinding, state } = controller;
  const toolbar = wayfinding.toolbar;
  const wf = wayfinding.actions;
  const [tip, setTip] = useState<string | null>(null);
  if (!toolbar) return null;

  return (
    <>
      <div className="bo-map__apmenu" onMouseLeave={wf.closeMenu}>
        <button
          type="button"
          className="bo-map__tool bo-map__tool--strong"
          aria-haspopup="menu"
          aria-expanded={state.wfMenuOpen}
          onClick={wf.toggleMenu}
          disabled={toolbar.detecting}
          data-testid="wf-detect-button"
        >
          {i18n.t(W.detect.button)}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {state.wfMenuOpen && (
          <div className="bo-map__apmenupanel bo-wf__detectmenu" role="menu">
            <div className="bo-map__eyebrow bo-map__apmenuhead">{i18n.t(W.detect.title)}</div>
            {toolbar.detectMenu.map((item) => (
              <button key={item.scope} type="button" role="menuitem" className="bo-map__apmenuitem" onClick={() => wf.runDetect(item.scope)}>
                <span className="bo-map__apmenulabel">{item.label}</span>
                <span className="bo-map__apmenusub">{item.sub}</span>
              </button>
            ))}
            <div className="bo-wf__menunote">{i18n.t(W.detect.note)}</div>
          </div>
        )}
      </div>

      <div className={`bo-wf__tools${toolbar.defaultEditing ? ' bo-wf__tools--none' : ''}`} role="toolbar" aria-label={i18n.t(W.tools.label)} data-tool={state.wfTool ?? 'none'}>
        {toolbar.tools.map((tool) => (
          <div key={tool.id} className="bo-wf__toolwrap" onMouseEnter={() => setTip(tool.id)} onMouseLeave={() => setTip(null)}>
            <button
              type="button"
              className={`bo-wf__tool${tool.active ? ' bo-wf__tool--on' : ''}`}
              aria-label={tool.label}
              aria-pressed={tool.active}
              onClick={() => wf.setTool(tool.id)}
              onFocus={() => setTip(tool.id)}
              onBlur={() => setTip(null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={tool.d} />
              </svg>
            </button>
            {tip === tool.id && (
              <div className="bo-wf__tip" role="tooltip">
                <span className="bo-wf__tiptitle">{tool.label}</span>
                <span className="bo-wf__tiptext">{tool.tip}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bo-wf__toolwrap" onMouseEnter={() => setTip('undo')} onMouseLeave={() => setTip(null)}>
        <button type="button" className="bo-wf__clear bo-wf__undo" aria-label={i18n.t(W.undo.label)} disabled={!toolbar.undo.can} onClick={wf.undo} data-testid="wf-undo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        {tip === 'undo' && (
          <div className="bo-wf__tip bo-wf__tip--right" role="tooltip">
            <span className="bo-wf__tiptitle">{i18n.t(W.undo.label)}</span>
            <span className="bo-wf__tiptext">{toolbar.undo.tip}</span>
          </div>
        )}
      </div>

      <div className="bo-wf__toolwrap" onMouseEnter={() => setTip('clear')} onMouseLeave={() => setTip(null)}>
        <button type="button" className="bo-wf__clear" aria-label={i18n.t(W.clear.label)} disabled={!toolbar.canClear} onClick={wf.clearPaths}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M6 7l1 13h10l1-13" />
          </svg>
        </button>
        {tip === 'clear' && (
          <div className="bo-wf__tip bo-wf__tip--right" role="tooltip">
            <span className="bo-wf__tiptitle">{i18n.t(W.clear.label)}</span>
            <span className="bo-wf__tiptext">{toolbar.clearTip}</span>
          </div>
        )}
      </div>
    </>
  );
};

/** Plotting / Wayfinding: the design's segmented switch at the start of the toolbar (self-tour properties only). */
export const ModeSwitch = ({ controller }: { controller: PropertyMapController }) => {
  const { wayfinding, state } = controller;
  if (!wayfinding.enabled) return null;
  return (
    <div className="bo-wf__modes" role="tablist" aria-label={i18n.t(W.modes.label)}>
      {(
        [
          ['plot', W.modes.plot],
          ['wayfind', W.modes.wayfind]
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={state.mode === mode}
          className={`bo-wf__mode${state.mode === mode ? ' bo-wf__mode--on' : ''}`}
          onClick={() => state.mode !== mode && wayfinding.actions.setMode(mode)}
        >
          {i18n.t(label)}
        </button>
      ))}
    </div>
  );
};
