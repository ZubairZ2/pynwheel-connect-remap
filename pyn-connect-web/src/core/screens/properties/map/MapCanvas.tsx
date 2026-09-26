'use client';

import { useEffect, useRef, useState } from 'react';

import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { LevelNode } from '~/core/utils/generator/map/mapNodes.generator';
import { edgeKey } from '~/core/utils/generator/map/mapState';
import { M, t } from '~/core/utils/generator/map/mapText';
import { SvgPlanLayer } from './SvgPlanLayer';

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
 * The plan surface: the floor SVG (its polygons live, as the design plots
 * onto them) or the floor image, at its own aspect ratio, and on top of it
 * the grid, the pathway edges, the route, the nodes, the pins and the
 * selected polygon's popover, every one positioned as a percentage of the
 * layer's own coordinate space so a stored position lands where the legacy
 * map drew it.
 */
export const MapCanvas = ({ controller }: { controller: PropertyMapController }) => {
  const { level, graph, space, state, assets, actions, planRef, fileInputRef, routeLines, cursor, plotArmedLabel, svgDoc, svgStatus, polygons, selectedPolygon } =
    controller;
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

  const onSvg = space === 'svg';
  const svgReady = onSvg && svgStatus === 'ready' && !!svgDoc;
  const src = onSvg ? null : assets?.image?.url ?? null;
  const has = !!assets?.has && (onSvg ? !!assets?.svg : !!src);
  const dims = graph.dims ?? (onSvg && level.svgWidth && level.svgHeight ? { w: level.svgWidth, h: level.svgHeight } : null);

  // Fit the layer's box inside the surface, centred, so percentages map onto it.
  const box = (() => {
    if (!dims || !surface.w || !surface.h) return { width: '100%', height: '100%' };
    const scale = Math.min(surface.w / dims.w, surface.h / dims.h);
    return { width: `${Math.floor(dims.w * scale)}px`, height: `${Math.floor(dims.h * scale)}px` };
  })();

  const dropping = state.plotSel.length > 0 || !!state.plotTarget;
  const labelled = polygons.filter((polygon) => polygon.filled || polygon.hover || polygon.selected);

  return (
    <div
      ref={surfaceRef}
      className={`bo-map__surface${has ? '' : ' bo-map__surface--empty'}${onSvg ? ' bo-map__surface--svg' : ''}`}
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
          {onSvg ? (
            svgReady ? (
              <SvgPlanLayer
                doc={svgDoc!}
                polygons={polygons}
                plotOn={state.tool === 'plot'}
                dropping={dropping}
                onPolygonDown={actions.clickPolygon}
                onPolygonHover={actions.hoverPolygon}
              />
            ) : (
              <div className="bo-map__missing" role="status">
                {svgStatus === 'failed' ? (
                  <span className="bo-map__missingstack">
                    {i18n.t(M.plan.svgFailed)}
                    <span className="bo-map__missingactions">
                      <button type="button" className="bo-map__planbtn" onClick={actions.retrySvg}>
                        {i18n.t(M.plan.retry)}
                      </button>
                      {assets?.image && (
                        <button type="button" className="bo-map__planbtn" onClick={() => actions.pickLayer('raster')}>
                          {i18n.t(M.plan.showImage)}
                        </button>
                      )}
                    </span>
                  </span>
                ) : (
                  i18n.t(M.plan.svgLoading)
                )}
              </div>
            )
          ) : failed === src ? (
            <div className="bo-map__missing" role="status">
              {i18n.t(M.plan.imageUnavailable)}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src ?? ''}
              className="bo-map__image"
              src={src ?? undefined}
              alt={i18n.t(M.plan.alt)}
              draggable={false}
              onLoad={(event) => actions.onImageLoad(level.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
              onError={() => setFailed(src ?? null)}
            />
          )}

          {state.gridOn && <div className="bo-map__grid" aria-hidden="true" />}

          {svgReady && labelled.length > 0 && (
            <div className="bo-map__polylabels" aria-hidden="true">
              {labelled.map((polygon) => (
                <div key={polygon.key} className="bo-map__polylabel" style={{ left: `${polygon.left}%`, top: `${polygon.top}%` }}>
                  <span className="bo-map__polycode">{polygon.code}</span>
                  {polygon.assigned && <span className="bo-map__polyassigned">{polygon.assigned}</span>}
                </div>
              ))}
            </div>
          )}

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
            const onPolygon = !!pin.polygon && svgReady;
            return (
              <div
                key={pin.key}
                data-node={pin.key}
                className={`bo-map__pin${selected ? ' bo-map__pin--selected' : ''}${pin.temporary ? ' bo-map__pin--temp' : ''}${onPolygon ? ' bo-map__pin--poly' : ''}`}
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%`, zIndex: selected ? 7 : 4 }}
                onPointerDown={actions.onPinDown(pin.ref)}
                title={pin.label}
              >
                <span
                  className="bo-map__pindot"
                  style={{
                    width: selected ? 26 : onPolygon ? 16 : 22,
                    height: selected ? 26 : onPolygon ? 16 : 22,
                    background: pin.color,
                    borderColor: selected ? '#7B3A87' : '#fff',
                    borderWidth: selected ? 3 : 2,
                    borderStyle: pin.temporary || pin.moved ? 'dashed' : 'solid'
                  }}
                >
                  {!onPolygon && <Icon name={pin.kind === 'unit' ? 'bed' : 'star'} style={{ transform: 'scale(0.62)' }} />}
                </span>
                {!onPolygon && <span className="bo-map__pinlabel">{pin.label}</span>}
              </div>
            );
          })}

          {selectedPolygon && svgReady && (
            <div
              className="bo-map__polypop"
              data-node="polygon-popover"
              style={{
                left: `${selectedPolygon.left}%`,
                top: `${selectedPolygon.top}%`,
                transform: selectedPolygon.below ? 'translate(-50%, 24px)' : 'translate(-50%, calc(-100% - 24px))'
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="bo-map__polypophead">
                <div className="bo-map__polypoptext">
                  <div className="bo-map__polypoptitle">{selectedPolygon.title}</div>
                  <div className="bo-map__polypopsub">{selectedPolygon.sub}</div>
                </div>
                <button type="button" className="bo-map__dismiss" aria-label={i18n.t(M.place.closePolygon)} onClick={actions.closeSelPoly}>
                  ×
                </button>
              </div>
              <div className="bo-map__polypoplist">
                {selectedPolygon.items.map((item) => (
                  <div key={item.key} className="bo-map__polypoprow">
                    <div className="bo-map__polypoptext">
                      <div className="bo-map__polypopname">{item.name}</div>
                      <div className="bo-map__polypopmeta">{item.meta}</div>
                    </div>
                    <button type="button" className="bo-map__unplot" onClick={() => actions.unplotItems([item.key])}>
                      {i18n.t(M.place.unplot)}
                    </button>
                  </div>
                ))}
              </div>
              {selectedPolygon.items.length === 0 && <div className="bo-map__polypopempty">{i18n.t(M.place.polygonEmpty)}</div>}
            </div>
          )}
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
              {assets?.image
                ? t(M.plan.needSvg, { level: `${level.sub} · ${level.label}` })
                : `${t(M.plan.emptyFor, { level: `${level.sub} · ${level.label}` })} ${i18n.t(M.plan.emptyHint)}`}
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
              {!assets?.image && (
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
              )}
              {assets?.image && (
                <button
                  type="button"
                  className="bo-inv__ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.pickLayer('raster');
                  }}
                >
                  {i18n.t(M.plan.showImage)}
                </button>
              )}
            </div>
            <div className="bo-map__dropnote">{i18n.t(M.plan.dropNote)}</div>
          </div>
        </div>
      )}

      {plotArmedLabel && has && (
        <div className="bo-map__armed" role="status">
          <Icon name="pin" style={{ color: '#7CC4E8', flexShrink: 0 }} />
          <div className="bo-map__armedlabel">{plotArmedLabel}</div>
          <button type="button" className="bo-map__armedcancel" onClick={actions.clearPlotTarget}>
            {i18n.t(M.plan.turnOff)}
          </button>
        </div>
      )}
    </div>
  );
};

export { edgeKey };
