'use client';

import { useEffect, useRef, useState } from 'react';

import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { LevelNode } from '~/core/utils/generator/map/mapNodes.generator';
import { edgeKey } from '~/core/utils/generator/map/mapState';
import { M, t } from '~/core/utils/generator/map/mapText';

/** The legacy route colour (maps.js draws the animated path in orange, stroke 5). */
const ROUTE_COLOR = '#ffa500';

const NODE_FILL: Record<LevelNode['kind'], string> = {
  hallway: '#171A21',
  junction: '#171A21',
  elevator: '#7B3A87',
  startingPoint: '#4A7212',
  tourStart: '#4A7212',
  door: '#3153d2'
};

const NODE_SIZE: Record<LevelNode['kind'], number> = {
  hallway: 12,
  junction: 12,
  elevator: 18,
  startingPoint: 18,
  tourStart: 18,
  door: 9
};

/**
 * The plan surface: the floor image at its own aspect ratio, and on top of it
 * the grid, the pathway edges, the route, the nodes and the pins, every one
 * positioned as a percentage of the image so a stored pixel lands where the
 * legacy map drew it.
 */
export const MapCanvas = ({ controller }: { controller: PropertyMapController }) => {
  const { level, graph, state, assets, actions, planRef, fileInputRef, routeLines, cursor, plotArmedLabel } = controller;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [surface, setSurface] = useState({ w: 0, h: 0 });
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return undefined;
    const measure = () => setSurface({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!level || !graph) return null;

  const dims = graph.dims;
  const showSvg = !!assets?.svg && (state.svgLayer || !assets.image);
  const src = showSvg ? assets?.svg?.url : assets?.image?.url;
  const has = !!assets?.has && !!src;

  // Fit the image's box inside the surface, centred, so percentages map onto it.
  const box = (() => {
    if (!dims || !surface.w || !surface.h) return { width: '100%', height: '100%' };
    const scale = Math.min(surface.w / dims.w, surface.h / dims.h);
    return { width: `${Math.floor(dims.w * scale)}px`, height: `${Math.floor(dims.h * scale)}px` };
  })();

  return (
    <div
      ref={surfaceRef}
      className={`bo-map__surface${has ? '' : ' bo-map__surface--empty'}`}
      data-testid="plan-surface"
      style={{ cursor }}
      onPointerDown={(event) => {
        if (has) actions.onSurfaceDown(event);
      }}
      onPointerMove={actions.onSurfaceMove}
      onPointerUp={actions.onSurfaceUp}
      onPointerCancel={actions.onSurfaceUp}
    >
      <input
        ref={fileInputRef}
        type="file"
        hidden
        data-testid="plan-file"
        onChange={(event) => {
          actions.onFilePicked(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      {has ? (
        <div ref={planRef} className="bo-map__plan" style={box}>
          {failed === src ? (
            <div className="bo-map__missing" role="status">
              {i18n.t(M.plan.imageUnavailable)}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              className="bo-map__image"
              src={src}
              alt={i18n.t(M.plan.alt)}
              draggable={false}
              onLoad={(event) => actions.onImageLoad(level.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
              onError={() => setFailed(src ?? null)}
            />
          )}

          {state.gridOn && <div className="bo-map__grid" aria-hidden="true" />}

          <svg className="bo-map__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {graph.edges.map((edge) => {
              const selected = state.selectedEdge === edge.key;
              return (
                <g key={edge.key}>
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    className="bo-map__edgehit"
                    onPointerDown={actions.onEdgeDown(edge.key)}
                  />
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={selected ? '#7B3A87' : edge.temporary ? '#4A7212' : '#0077AE'}
                    strokeWidth={selected ? 3.5 : 2.5}
                    strokeDasharray={edge.temporary ? '6 4' : undefined}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            {routeLines.map((line, index) => (
              <line
                key={`route-${index}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={ROUTE_COLOR}
                strokeWidth={line.head ? 6 : 4}
                strokeOpacity={line.head ? 1 : 0.85}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                className="bo-map__route"
              />
            ))}
          </svg>

          {graph.nodes.map((node) => {
            const selected = state.selectedNode === node.key;
            const edgeFrom = state.edgeFrom === node.key;
            const chain = state.chainFrom === node.key && state.tool === 'hallway';
            const quiet = node.kind === 'hallway' || node.kind === 'door';
            const size = NODE_SIZE[node.kind] + (selected ? 4 : 0);
            return (
              <div
                key={node.key}
                data-node={node.key}
                className={`bo-map__node bo-map__node--${node.kind}${selected ? ' bo-map__node--selected' : ''}`}
                style={{ left: `${node.xPct}%`, top: `${node.yPct}%`, zIndex: selected ? 6 : node.kind === 'hallway' ? 2 : 3 }}
                onPointerDown={actions.onNodeDown(node.key)}
                title={node.label}
              >
                <span
                  className="bo-map__dot"
                  style={{
                    width: size,
                    height: size,
                    background: node.isStart && node.kind !== 'tourStart' ? '#4A7212' : NODE_FILL[node.kind],
                    borderColor: selected ? '#7B3A87' : edgeFrom ? '#4A7212' : chain ? '#C62534' : '#fff',
                    borderWidth: selected || edgeFrom || chain ? 3 : 2,
                    borderStyle: node.temporary ? 'dashed' : 'solid'
                  }}
                />
                {(!quiet || selected) && <span className="bo-map__nodelabel">{node.label}</span>}
              </div>
            );
          })}

          {graph.pins.map((pin) => {
            const selected = !!state.selectedPin && `${state.selectedPin.kind}:${state.selectedPin.id}` === pin.key;
            return (
              <div
                key={pin.key}
                data-node={pin.key}
                className={`bo-map__pin${selected ? ' bo-map__pin--selected' : ''}${pin.temporary ? ' bo-map__pin--temp' : ''}`}
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%`, zIndex: selected ? 7 : 4 }}
                onPointerDown={actions.onPinDown(pin.ref)}
                title={pin.label}
              >
                <span
                  className="bo-map__pindot"
                  style={{
                    width: selected ? 26 : 22,
                    height: selected ? 26 : 22,
                    background: pin.color,
                    borderColor: selected ? '#7B3A87' : '#fff',
                    borderWidth: selected ? 3 : 2,
                    borderStyle: pin.temporary || pin.moved ? 'dashed' : 'solid'
                  }}
                >
                  <Icon name={pin.kind === 'unit' ? 'bed' : 'star'} style={{ transform: 'scale(0.62)' }} />
                </span>
                <span className="bo-map__pinlabel">{pin.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="bo-map__drop"
          onDragOver={actions.onPlanDragOver}
          onDragLeave={actions.onPlanDragLeave}
          onDrop={actions.onPlanDrop}
          onClick={actions.uploadSvg}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              actions.uploadSvg();
            }
          }}
        >
          <div className={`bo-map__dropzone${state.svgDrag ? ' bo-map__dropzone--active' : ''}`}>
            <Icon name="upload" style={{ color: 'var(--bo-accent)', transform: 'scale(1.6)', marginBottom: 6 }} />
            <div className="bo-map__droptitle">{i18n.t(state.svgDrag ? M.plan.dropActive : M.plan.dropLabel)}</div>
            <div className="bo-map__dropsub">
              {t(M.plan.emptyFor, { level: `${level.sub} · ${level.label}` })} {i18n.t(M.plan.emptyHint)}
            </div>
            <div className="bo-map__dropactions">
              <button
                type="button"
                className="bo-inv__plot"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.uploadSvg();
                }}
              >
                {i18n.t(M.plan.chooseSvg)}
              </button>
              <button
                type="button"
                className="bo-inv__ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.uploadRaster();
                }}
              >
                {i18n.t(M.plan.uploadInstead)}
              </button>
            </div>
            <div className="bo-map__dropnote">{i18n.t(M.plan.dropNote)}</div>
          </div>
        </div>
      )}

      {plotArmedLabel && has && (
        <div className="bo-map__armed" role="status">
          <Icon name="pin" style={{ color: 'var(--bo-accent)', flexShrink: 0 }} />
          <div className="bo-map__armedlabel">{plotArmedLabel}</div>
          <button type="button" className="bo-map__armedcancel" onClick={actions.clearPlotTarget}>
            {i18n.t(M.plan.cancel)}
          </button>
        </div>
      )}
    </div>
  );
};

export { edgeKey };
