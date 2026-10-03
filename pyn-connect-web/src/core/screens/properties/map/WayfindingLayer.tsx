'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { i18n } from '~/resources/i18n';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { WfLayer } from '~/core/utils/generator/map/wayfinding.generator';
import { M } from '~/core/utils/generator/map/mapText';
import type { EdgeKind } from '~/core/utils/wayfinding/hallways/types';
import { stopTypeOf, type StopTypeId } from '~/core/utils/wayfinding/stopTypes';

const W = M.wayfinding;

const PATH = '#0077AE';
const ROUTE = '#4A7212';
const SELECTED = '#E0A800';
const DANGER = '#C62534';

/** The POC's path styles by kind, in this screen's blue: traced / inferred solid, a bridged gap dark and dashed, Auto-Connect light and dotted, hand-drawn dark. */
const KIND_STYLE: Record<EdgeKind, { color: string; dash?: string }> = {
  stored: { color: PATH },
  traced: { color: PATH },
  inferred: { color: '#2F86C4' },
  bridge: { color: '#0B4F7A', dash: '7 4' },
  knn: { color: '#6FB2DD', dash: '2 4' },
  manual: { color: '#0B4F7A' }
};

/**
 * The Wayfinding layer of the plan: the hallway paths and points, the
 * dashed bridge from each unit, amenity or stop to the point it joins (a
 * bridge selects, erases and double-click-removes like a path), the small
 * hollow unit / amenity markers, the stop markers, the blocker zones and
 * the route — all positioned as percentages of the plan, inside it, so they
 * stay in place as it zooms and pans.
 */
export const WayfindingLayer = ({
  controller,
  layer,
  onStopHover
}: {
  controller: PropertyMapController;
  layer: WfLayer;
  /** The stop under the pointer (null when none): the canvas shows its popover on hover as it does on click. */
  onStopHover?: (key: string | null) => void;
}) => {
  const { wayfinding, state } = controller;
  const wf = wayfinding.actions;
  const tool = state.wfTool;
  const route = state.wfRoute && state.wfRoute.ok ? state.wfRoute : null;
  const anim = state.wfAnim;
  const animLeg = route && anim ? route.legs[anim.leg] : null;
  const animHere = !!animLeg && animLeg.ck === wayfinding.copy && !!layer.route;

  return (
    <>
      <svg className="bo-map__edges bo-wf__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {layer.blockers.map((zone) => (
          <ellipse key={zone.key} cx={zone.xPct} cy={zone.yPct} rx={zone.rPctW} ry={zone.rPctH} fill="rgba(198,37,52,0.1)" stroke={DANGER} strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
        ))}
        {layer.links.map((link) => (
          <g key={`link-${link.key}`}>
            <line
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              className="bo-map__edgehit bo-wf__linkhit"
              onPointerDown={wf.onLinkDown(link.key)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                wf.onLinkDoubleClick(link.key);
              }}
              data-wf-link={link.key}
              data-linked={link.linked ? '1' : '0'}
            >
              {tool == null && <title>{i18n.t(W.hints.link)}</title>}
            </line>
            <line
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke={link.selected ? SELECTED : link.linked ? PATH : DANGER}
              strokeOpacity={link.selected ? 1 : link.linked ? 0.55 : 0.8}
              strokeWidth={link.selected ? 3 : link.explicit ? 2 : 1.25}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
              data-testid="wf-link"
            />
          </g>
        ))}
        {layer.paths.map((path) => {
          const style = KIND_STYLE[path.kind];
          return (
            <g key={path.key}>
              <polyline
                points={path.d}
                fill="none"
                className="bo-map__edgehit bo-wf__hit"
                onPointerDown={wf.onPathDown(path.key)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  wf.onPathDoubleClick(path.key);
                }}
                data-wf-path={path.key}
                data-kind={path.kind}
              >
                {tool == null && <title>{i18n.t(W.hints.path)}</title>}
              </polyline>
              <polyline
                points={path.d}
                fill="none"
                stroke={path.selected ? SELECTED : path.onRoute ? (anim ? '#B9D69C' : ROUTE) : style.color}
                strokeWidth={path.selected ? 4 : path.onRoute ? 6 : 3}
                strokeOpacity={path.onRoute || path.selected ? 1 : layer.dimmed ? 0.3 : 0.85}
                strokeDasharray={path.onRoute ? undefined : (style.dash ?? (path.temporary && path.kind === 'manual' ? '6 4' : undefined))}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>
          );
        })}
        {layer.bend && (
          <line
            x1={layer.bend.x1}
            y1={layer.bend.y1}
            x2={layer.bend.x2}
            y2={layer.bend.y2}
            stroke={SELECTED}
            strokeWidth={3}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            data-testid="wf-bend"
          />
        )}
        {layer.route && !animHere && (
          <polyline
            points={layer.route.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={ROUTE}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            data-testid="wf-route-line"
          />
        )}
      </svg>

      {layer.doors.map((door) => (
        <span key={door.key} className="bo-wf__door" style={{ left: `${door.xPct}%`, top: `${door.yPct}%` }} aria-hidden="true" />
      ))}

      {layer.anchors.map((anchor) => (
        <div
          key={anchor.key}
          data-node={anchor.key}
          data-testid="wf-anchor"
          data-linked={anchor.idle ? undefined : anchor.linked ? '1' : '0'}
          data-polygon={anchor.polygon ?? undefined}
          className={`bo-wf__anchor bo-wf__anchor--${anchor.kind}${anchor.idle ? ' bo-wf__anchor--idle' : anchor.linked ? '' : ' bo-wf__anchor--unlinked'}${anchor.selected ? ' bo-wf__anchor--selected' : ''}`}
          style={{ left: `${anchor.xPct}%`, top: `${anchor.yPct}%` }}
          title={tool == null && anchor.linked ? `${anchor.name} · ${i18n.t(W.hints.link)}` : anchor.name}
          onPointerDown={wf.onAnchorDown(anchor.key, false)}
          onDoubleClick={(event) => {
            event.stopPropagation();
            wf.onAnchorDoubleClick(anchor.key);
          }}
        />
      ))}

      {layer.points.map((point) => (
        <div
          key={point.key}
          data-node={point.key}
          data-testid="wf-point"
          data-pending={point.pending ? '1' : undefined}
          className={`bo-wf__point${point.selected || point.from ? ' bo-wf__point--selected' : ''}${point.onRoute ? ' bo-wf__point--route' : ''}${point.lonely ? ' bo-wf__point--lonely' : ''}${point.temporary ? ' bo-wf__point--temp' : ''}${point.pending ? ' bo-wf__point--pending' : ''}${point.dragging ? ' bo-wf__point--dragging' : ''}`}
          style={{
            left: `${point.xPct}%`,
            top: `${point.yPct}%`,
            cursor: tool === 'move' || tool == null ? 'grab' : 'pointer',
            // The POC fades a proposal by how unsure it is.
            opacity: point.pending && point.confidence != null ? 0.45 + point.confidence * 0.55 : undefined
          }}
          onPointerDown={wf.onPointDown(point.key)}
          onDoubleClick={(event) => {
            event.stopPropagation();
            wf.onPointDoubleClick(point.key);
          }}
          title={point.lonely ? i18n.t(W.selection.isolatedTitle) : tool == null ? i18n.t(W.hints.point) : undefined}
        />
      ))}

      {layer.stops.map((stop) => (
        <StopMarker
          key={stop.key}
          stopKey={stop.key}
          name={stop.name}
          type={stop.type}
          xPct={stop.xPct}
          yPct={stop.yPct}
          selected={stop.selected}
          temporary={stop.temporary}
          cursor={tool === 'move' ? 'grab' : 'pointer'}
          onPointerDown={wf.onAnchorDown(stop.key, true)}
          onDoubleClick={() => wf.onAnchorDoubleClick(stop.key)}
          onHover={onStopHover}
        />
      ))}

      {animHere && animLeg && layer.route && (
        <RouteDot key={`${anim!.run}-${anim!.leg}`} points={layer.route} mode={state.wfAnimMode} playing={anim!.playing && !anim!.finished} onDone={wf.animDone} />
      )}

      {layer.badge && (
        <button
          type="button"
          className="bo-wf__badge"
          style={{ left: `${layer.badge.xPct}%`, top: `${layer.badge.yPct}%` }}
          title={i18n.t(W.selection.deselectEsc)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={wf.deselect}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {i18n.t(W.selection.deselect)}
        </button>
      )}
    </>
  );
};

/** A stop on the plan, as the design draws it: a disc in the type's colour with its glyph, the name under it. */
export const StopMarker = ({
  stopKey,
  name,
  type,
  xPct,
  yPct,
  selected,
  temporary,
  cursor,
  onPointerDown,
  onDoubleClick,
  onHover
}: {
  stopKey: string;
  name: string;
  type: StopTypeId;
  xPct: number;
  yPct: number;
  selected: boolean;
  temporary: boolean;
  cursor: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  /** Hover in / out (the key, or null): the canvas opens the stop's popover on hover, the same one a click pins. */
  onHover?: (key: string | null) => void;
}) => {
  const kind = stopTypeOf(type);
  return (
    <div
      data-node={stopKey}
      data-testid="wf-stop"
      className={`bo-wf__stop${selected ? ' bo-wf__stop--selected' : ''}${temporary ? ' bo-wf__stop--temp' : ''}`}
      style={{ left: `${xPct}%`, top: `${yPct}%`, cursor }}
      onPointerDown={onPointerDown}
      onDoubleClick={
        onDoubleClick &&
        ((event) => {
          event.stopPropagation();
          onDoubleClick();
        })
      }
      onPointerEnter={onHover && (() => onHover(stopKey))}
      onPointerLeave={onHover && (() => onHover(null))}
    >
      <span className="bo-wf__stopdisc" style={{ background: kind.color }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={kind.d} />
        </svg>
      </span>
      <span className="bo-wf__stopname">{name}</span>
    </div>
  );
};

/**
 * The animated walker of "Play Route", as the design animates it: point by
 * point (slow, through every hallway point) or stop by stop (glides, pauses
 * at each stop); a trail behind, a pulse around, the stop's name on arrival.
 */
const RouteDot = ({ points, mode, playing, onDone }: { points: { x: number; y: number; stop: boolean; name: string }[]; mode: 'point' | 'stop'; playing: boolean; onDone: () => void }) => {
  const [frame, setFrame] = useState({ x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, index: 0, label: '', phase: 0 });
  const elapsed = useRef(0);
  const last = useRef<number | null>(null);
  const done = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const slow = mode === 'point';
    const speed = slow ? 17 : 40; // percent of the plan per second
    const segments: { kind: 'pause' | 'move'; index: number; ms: number }[] = [];
    points.forEach((point, index) => {
      if (index === 0) {
        segments.push({ kind: 'pause', index, ms: point.stop ? 1000 : 350 });
        return;
      }
      const previous = points[index - 1];
      segments.push({ kind: 'move', index, ms: Math.max(slow ? 220 : 60, (Math.hypot(point.x - previous.x, point.y - previous.y) / speed) * 1000) });
      const end = index === points.length - 1;
      const ms = end ? 1100 : point.stop ? (slow ? 800 : 1100) : slow ? 320 : 0;
      if (ms) segments.push({ kind: 'pause', index, ms });
    });
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (playingRef.current && !done.current && last.current != null) elapsed.current += Math.min(64, now - last.current);
      last.current = now;
      let time = elapsed.current;
      let next: typeof frame | null = null;
      for (const segment of segments) {
        if (time <= segment.ms) {
          const point = points[segment.index];
          if (segment.kind === 'pause') next = { x: point.x, y: point.y, index: segment.index, label: point.stop ? point.name : '', phase: 0 };
          else {
            const from = points[segment.index - 1];
            let k = time / segment.ms;
            if (slow) k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            next = { x: from.x + (point.x - from.x) * k, y: from.y + (point.y - from.y) * k, index: segment.index - 1, label: '', phase: 0 };
          }
          break;
        }
        time -= segment.ms;
      }
      if (!next) {
        const end = points[points.length - 1];
        next = { x: end.x, y: end.y, index: points.length - 1, label: end.stop ? end.name : '', phase: 0 };
        if (!done.current && playingRef.current) {
          done.current = true;
          window.setTimeout(() => doneRef.current(), 0);
        }
      }
      next.phase = (now % 900) / 900;
      setFrame(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, points]);

  if (!points.length) return null;
  const trail = [...points.slice(0, frame.index + 1).map((point) => `${point.x},${point.y}`), `${frame.x},${frame.y}`].join(' ');
  return (
    <>
      <svg className="bo-map__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={trail} fill="none" stroke="#2F6B00" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {mode === 'point' &&
        points.slice(0, frame.index + 1).map((point, index) => <span key={index} className="bo-wf__trailpoint" style={{ left: `${point.x}%`, top: `${point.y}%` }} />)}
      <span className="bo-wf__pulse" style={{ left: `${frame.x}%`, top: `${frame.y}%`, transform: `translate(-50%, -50%) scale(${1 + frame.phase * 1.2})`, opacity: 1 - frame.phase }} />
      <span className="bo-wf__walker" data-testid="wf-walker" style={{ left: `${frame.x}%`, top: `${frame.y}%` }} />
      {frame.label && (
        <span className="bo-wf__walkerlabel" style={{ left: `${frame.x}%`, top: `${frame.y}%` }}>
          {frame.label}
        </span>
      )}
    </>
  );
};
