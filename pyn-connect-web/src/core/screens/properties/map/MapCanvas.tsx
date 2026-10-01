'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { useImageStatus } from '~/core/hooks/useImageStatus';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import type { LevelNode, LevelPin } from '~/core/utils/generator/map/mapNodes.generator';
import { edgeKey } from '~/core/utils/generator/map/mapState';
import { M, t } from '~/core/utils/generator/map/mapText';
import {
  AmenityGlyph,
  DoorGlyph,
  DotGlyph,
  EDGE_COLOR,
  ELEVATOR_COLOR,
  ENTRY_COLOR,
  HALLWAY_COLOR,
  HALLWAY_SELECTED_COLOR,
  LocationGlyph,
  NodeGlyph,
  PlusGlyph,
  ResetViewIcon,
  TourStartGlyph,
  markerWidth
} from './MapMarkers';
import { SvgPlanLayer } from './SvgPlanLayer';
import { StopMarker, WayfindingLayer } from './WayfindingLayer';
import { stopTypeOf } from '~/core/utils/wayfinding/stopTypes';

/** The legacy route colour (maps.js draws the animated path in orange, stroke 5). */
const ROUTE_COLOR = '#ffa500';

/** The margin around the plan inside the canvas (the design's plan sits inset, not edge to edge). */
const PLAN_INSET = 24;

/*
 * The viewport. `scale` is relative to the fitted plan (1 = the whole floor
 * in view); `x` / `y` move the plan's centre from the canvas's centre, in
 * canvas pixels. The legacy page ran timmywil/panzoom over the same
 * container (zoomHandler.js): wheel and drag, a ×1.3 step per button towards
 * the canvas centre, and a reset to the fitted, centred plan; its bounds kept
 * a tenth of the plan in view.
 */
interface View {
  scale: number;
  x: number;
  y: number;
}

const DEFAULT_VIEW: View = { scale: 1, x: 0, y: 0 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const BUTTON_ZOOM_STEP = 1.3;
const WHEEL_ZOOM_SPEED = 0.0015;
const BOUNDS_PADDING = 0.1;
/** A pointer that moves less than this before it lifts is a click, not a pan. */
const PAN_THRESHOLD = 3;

const clampZoom = (scale: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));

/** The legacy sizes of the node glyphs, in plan pixels at the image's own scale (`fa-lg` in a 30px box; `fa-xs` at the door size). */
const NODE_GLYPH = 18;
const DOOR_GLYPH = 22;
const TOUR_START = 25;

/*
 * The plan surface: the floor SVG (its polygons live, as the design plots
 * onto them) or the floor image, at its own aspect ratio, and on top of it
 * the pathway edges, the route, the nodes, the pins and the polygon labels,
 * every one positioned as a percentage of the layer's own coordinate space
 * so a stored position lands where the legacy map drew it and stays there
 * while the plan zooms and pans. The markers are the legacy page's — the
 * theme's location marker with its tip on the point, the green door plus,
 * the amenity square, the hallway dots and 1px lines — sized in the plan's
 * pixels so they scale with it, as the legacy panzoom container scaled them.
 */
export const MapCanvas = ({ controller }: { controller: PropertyMapController }) => {
  const { map, level, graph, space, state, assets, actions, planRef, fileInputRef, routeLines, cursor, plotArmedLabel, svgDoc, svgStatus, polygons, selectedPolygon, wayfinding } =
    controller;
  const wfLayer = wayfinding.layer;
  const { markers } = map.inventory;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [surface, setSurface] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [panning, setPanning] = useState(false);
  const onSvg = space === 'svg';
  const src = onSvg ? null : (assets?.image?.url ?? null);
  const image = useImageStatus(src);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return undefined;
    const measure = () => setSurface({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const svgReady = onSvg && svgStatus === 'ready' && !!svgDoc;
  const has = !!assets?.has && (onSvg ? !!assets?.svg : !!src);
  const dims = graph?.dims ?? (onSvg && level?.svgWidth && level?.svgHeight ? { w: level.svgWidth, h: level.svgHeight } : null);

  // Fit the layer's box inside the surface, centred and inset as the design
  // draws the plan, so percentages map onto it.
  const fit = (() => {
    if (!dims || !surface.w || !surface.h) return null;
    const scale = Math.min((surface.w - 2 * PLAN_INSET) / dims.w, (surface.h - 2 * PLAN_INSET) / dims.h);
    return { w: Math.floor(dims.w * scale), h: Math.floor(dims.h * scale) };
  })();
  const box = fit ? { width: `${fit.w}px`, height: `${fit.h}px` } : { width: '100%', height: '100%' };
  /** One image (or viewBox) pixel, in the plan's pixels: the legacy marker sizes are given in the former. */
  const k = fit && dims ? fit.w / dims.w : 1;

  // The geometry the zoom maths reads, kept current for the native wheel listener.
  const geometry = useRef({ surface, fit });
  geometry.current = { surface, fit };

  /** Keeps at least a tenth of the plan inside the canvas, as the legacy bounds did. */
  const bound = useCallback((next: View): View => {
    const { surface: s, fit: f } = geometry.current;
    if (!f || !s.w || !s.h) return next;
    const planW = f.w * next.scale;
    const planH = f.h * next.scale;
    const padX = Math.min(planW, s.w) * BOUNDS_PADDING;
    const padY = Math.min(planH, s.h) * BOUNDS_PADDING;
    const centreX = s.w / 2 + next.x;
    const centreY = s.h / 2 + next.y;
    const boundedX = Math.min(s.w - padX + planW / 2, Math.max(padX - planW / 2, centreX));
    const boundedY = Math.min(s.h - padY + planH / 2, Math.max(padY - planH / 2, centreY));
    return { scale: next.scale, x: boundedX - s.w / 2, y: boundedY - s.h / 2 };
  }, []);

  /** Zooms by a factor about a canvas point (the pointer), or about the canvas centre (the buttons). */
  const zoomAt = useCallback(
    (factor: number, point: { x: number; y: number } | null) => {
      setView((current) => {
        const { surface: s } = geometry.current;
        const scale = clampZoom(current.scale * factor);
        if (scale === current.scale || !s.w || !s.h) return current;
        const centre = { x: s.w / 2, y: s.h / 2 };
        const at = point ?? centre;
        const planCentre = { x: centre.x + current.x, y: centre.y + current.y };
        // The plan point under the pointer stays under it.
        const local = { x: (at.x - planCentre.x) / current.scale, y: (at.y - planCentre.y) / current.scale };
        const next = { x: at.x - local.x * scale, y: at.y - local.y * scale };
        return bound({ scale, x: next.x - centre.x, y: next.y - centre.y });
      });
    },
    [bound]
  );

  const resetView = useCallback(() => setView(DEFAULT_VIEW), []);

  // A new floor, or the other layer of the same floor, opens fitted and centred.
  useEffect(() => {
    setView(DEFAULT_VIEW);
  }, [level?.id, space]);

  // The wheel zooms about the pointer. React registers wheel listeners as
  // passive, so the page would scroll too; a native listener can prevent that.
  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!geometry.current.fit) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Dragging the empty canvas pans it; a still click keeps clearing the selection.
  const pan = useRef<{ pointerId: number; startX: number; startY: number; origin: View; moved: boolean; down: ReactPointerEvent<HTMLDivElement> } | null>(null);
  // Wayfinding clicks and drags start on points and stops, so the empty plan always pans (a still click still reaches the tool).
  const canPan = has && (wfLayer ? !state.stopTarget : state.tool === 'select' && !plotArmedLabel);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!has) return;
    if ((event.target as Element).closest('[data-node]')) {
      actions.onSurfaceDown(event);
      return;
    }
    if (!canPan || event.button !== 0) {
      actions.onSurfaceDown(event);
      return;
    }
    pan.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: view, moved: false, down: event };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    actions.onSurfaceMove(event);
    const current = pan.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
      current.moved = true;
      setPanning(true);
    }
    setView(bound({ ...current.origin, x: current.origin.x + dx, y: current.origin.y + dy }));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    actions.onSurfaceUp();
    const current = pan.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pan.current = null;
    setPanning(false);
    if (!current.moved) actions.onSurfaceDown(current.down);
  };

  if (!level || !graph) return null;

  const isDefaultView = view.scale === 1 && view.x === 0 && view.y === 0;
  const plateStops = wayfinding.plate?.stops ?? [];
  const placedTempStops = plateStops.filter((stop) => stop.temporary && stop.placed);
  const selectedStop = !onSvg && state.selStop && !state.dragging ? (plateStops.find((stop) => stop.key === state.selStop && stop.placed) ?? null) : null;
  const dropping = state.plotSel.length > 0 || !!state.plotTarget;
  // A label prints on a polygon when the SVG gives it no text of its own and it is active, or when something with another name sits on it.
  const labelled = polygons.filter((polygon) => (polygon.showCode && (polygon.filled || polygon.hover || polygon.selected)) || polygon.assigned);
  const showDoorPlus = markers.autoWayfinding && map.inventory.selfTour;

  /** A stored plan point, as canvas pixels under the current view (for chrome that must not scale, like the popover). */
  const toCanvas = (leftPct: number, topPct: number): { left: number; top: number } => {
    if (!fit) return { left: 0, top: 0 };
    return {
      left: surface.w / 2 + view.x + (leftPct / 100 - 0.5) * fit.w * view.scale,
      top: surface.h / 2 + view.y + (topPct / 100 - 0.5) * fit.h * view.scale
    };
  };

  const nodeGlyph = (node: LevelNode, selected: boolean) => {
    switch (node.kind) {
      case 'hallway':
      case 'junction':
        return <NodeGlyph size={Math.max(6, NODE_GLYPH * k)} color={selected ? HALLWAY_SELECTED_COLOR : HALLWAY_COLOR} dashed={node.temporary} />;
      case 'door':
        return <DoorGlyph size={Math.max(8, DOOR_GLYPH * k)} color={markers.doorColor} />;
      case 'tourStart':
        return <TourStartGlyph size={Math.max(10, TOUR_START * k)} />;
      case 'elevator':
        return <DotGlyph size={Math.max(8, NODE_GLYPH * k)} color={ELEVATOR_COLOR} ring={selected ? HALLWAY_SELECTED_COLOR : undefined} />;
      default:
        return <DotGlyph size={Math.max(8, NODE_GLYPH * k)} color={node.isStart ? ENTRY_COLOR : ELEVATOR_COLOR} ring={selected ? HALLWAY_SELECTED_COLOR : undefined} />;
    }
  };

  const pinGlyph = (pin: LevelPin) => {
    if (pin.kind === 'amenity') {
      const size = Math.max(10, markers.amenitySize * k);
      return (
        <>
          <AmenityGlyph size={size} color={markers.amenityColor} />
          {showDoorPlus && !pin.hasDoor && (
            <PlusGlyph size={Math.max(6, size / 1.8)} color={markers.doorPlusColor} style={{ left: size / 2 - size * 0.2, top: -size / 2 }} />
          )}
        </>
      );
    }
    const size = Math.max(10, markers.unitSize * k);
    return (
      <>
        <LocationGlyph size={size} color={markers.unitColor} />
        {showDoorPlus && !pin.hasDoor && (
          <PlusGlyph size={Math.max(6, size / 2)} color={markers.doorPlusColor} style={{ left: markerWidth(size) / 2 - size * 0.2, top: -size }} />
        )}
      </>
    );
  };

  return (
    <div
      ref={surfaceRef}
      className={`bo-map__surface${has ? '' : ' bo-map__surface--empty'}${onSvg ? ' bo-map__surface--svg' : ''}${panning ? ' bo-map__surface--panning' : ''}`}
      data-testid="plan-surface"
      style={{ cursor: panning ? 'grabbing' : cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
        <div
          ref={planRef}
          className="bo-map__plan"
          data-testid="plan"
          data-scale={view.scale.toFixed(3)}
          style={{ ...box, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {onSvg ? (
            svgReady ? (
              <SvgPlanLayer
                doc={svgDoc!}
                polygons={polygons}
                plotOn={state.tool === 'plot'}
                dropping={dropping}
                onPolygonDown={actions.clickPolygon}
                onPolygonHover={actions.hoverPolygon}
                fontFamily={markers.svgFontFamily}
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
                  <LoadingIndicator variant="cover" label={i18n.t(M.plan.svgLoading)} />
                )}
              </div>
            )
          ) : image.status === 'failed' ? (
            <div className="bo-map__missing" role="status">
              {i18n.t(M.plan.imageUnavailable)}
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- the floor image is a CMS file on S3, or a local object URL. */}
              <img
                key={src ?? ''}
                ref={image.ref}
                className="bo-map__image"
                src={src ?? undefined}
                alt={i18n.t(M.plan.alt)}
                draggable={false}
                onLoad={(event) => {
                  image.onLoad();
                  actions.onImageLoad(level.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
                }}
                onError={image.onError}
              />
              {image.status === 'loading' && <LoadingIndicator variant="cover" label={i18n.t(M.plan.imageLoading)} />}
            </>
          )}

          {svgReady && labelled.length > 0 && (
            <div className="bo-map__polylabels" aria-hidden="true">
              {labelled.map((polygon) => (
                <div key={polygon.key} className="bo-map__polylabel" style={{ left: `${polygon.left}%`, top: `${polygon.top}%` }}>
                  {polygon.showCode && <span className="bo-map__polycode">{polygon.code}</span>}
                  {polygon.assigned && <span className="bo-map__polyassigned">{polygon.assigned}</span>}
                </div>
              ))}
            </div>
          )}

          {wfLayer && <WayfindingLayer controller={controller} layer={wfLayer} />}

          {!wfLayer && (
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
                    stroke={selected ? HALLWAY_SELECTED_COLOR : edge.temporary ? ENTRY_COLOR : EDGE_COLOR}
                    strokeWidth={selected ? 2.5 : 1}
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
          )}

          {!wfLayer && graph.nodes.map((node) => {
            const selected = state.selectedNode === node.key;
            const edgeFrom = state.edgeFrom === node.key;
            return (
              <div
                key={node.key}
                data-node={node.key}
                className={`bo-map__marker bo-map__node bo-map__node--${node.kind}${selected ? ' bo-map__node--selected bo-map__marker--selected' : ''}${edgeFrom ? ' bo-map__marker--from' : ''}${node.temporary ? ' bo-map__marker--temp' : ''}`}
                style={{ left: `${node.xPct}%`, top: `${node.yPct}%`, zIndex: selected ? 6 : node.kind === 'hallway' ? 2 : 3 }}
                onPointerDown={actions.onNodeDown(node.key)}
                title={node.label}
              >
                {nodeGlyph(node, selected)}
                {selected && <span className="bo-map__nodelabel bo-map__markerlabel">{node.label}</span>}
              </div>
            );
          })}

          {!wfLayer &&
            onSvg === false &&
            placedTempStops.map((stop) => (
              <StopMarker
                key={stop.key}
                stopKey={stop.key}
                name={stop.label}
                type={stop.type}
                xPct={stop.xPct}
                yPct={stop.yPct}
                selected={state.selStop === stop.key}
                temporary
                cursor="pointer"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  wayfinding.actions.selectStop(stop.key);
                }}
              />
            ))}

          {graph.pins.map((pin) => {
            // A placement on a polygon is the filled polygon itself, as the legacy page clones the shape: no marker on top.
            if (pin.polygon && svgReady) return null;
            // Wayfinding on a stacked floorplate shows the floor in view's units only.
            if (wfLayer && !wfLayer.pins.has(pin.key)) return null;
            const selected = !!state.selectedPin && `${state.selectedPin.kind}:${state.selectedPin.id}` === pin.key;
            return (
              <div
                key={pin.key}
                data-node={pin.key}
                className={`bo-map__marker bo-map__pin bo-map__pin--${pin.kind}${selected ? ' bo-map__pin--selected bo-map__marker--selected' : ''}${pin.temporary || pin.moved ? ' bo-map__pin--temp bo-map__marker--temp' : ''}`}
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%`, zIndex: selected ? 7 : 4 }}
                onPointerDown={wfLayer ? wayfinding.actions.onAnchorDown(pin.key, false) : actions.onPinDown(pin.ref)}
                title={pin.temporary ? `${pin.label} · ${i18n.t(M.selection.temporary)}` : pin.label}
              >
                {wfLayer ? pinGlyph({ ...pin, hasDoor: true }) : pinGlyph(pin)}
                {selected && <span className="bo-map__nodelabel bo-map__markerlabel">{pin.label}</span>}
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
            {/* The design's No SVG state: the floor SVG is what plotting drops onto. A picked file is a local preview only. */}
            <div className="bo-map__dropsub">{t(M.plan.needSvg, { level: `${level.sub} · ${level.label}` })}</div>
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
            </div>
          </div>
        </div>
      )}

      {selectedPolygon && svgReady && has && (
        <div
          className="bo-map__polypop"
          data-node="polygon-popover"
          style={{
            ...toCanvas(selectedPolygon.left, selectedPolygon.top),
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
          <div className="bo-map__polypoprows">
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

      {selectedStop && has && (
        <div
          className="bo-map__polypop bo-wf__stoppop"
          data-node="stop-popover"
          data-testid="stop-popover"
          style={{
            ...toCanvas(selectedStop.xPct, selectedStop.yPct),
            transform: selectedStop.yPct < 50 ? 'translate(-50%, 28px)' : 'translate(-50%, calc(-100% - 28px))'
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="bo-map__polypophead">
            <span className="bo-wf__stopdisc bo-wf__stopdisc--static" style={{ background: stopTypeOf(selectedStop.type).color }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={stopTypeOf(selectedStop.type).d} />
              </svg>
            </span>
            <div className="bo-map__polypoptext">
              <div className="bo-map__polypoptitle">{selectedStop.label}</div>
              <div className="bo-map__polypopsub">
                {i18n.t(stopTypeOf(selectedStop.type).label)} · {i18n.t(selectedStop.temporary ? M.stops.popover.temporary : M.stops.popover.stored)}
              </div>
            </div>
            <button type="button" className="bo-map__dismiss" aria-label={i18n.t(M.place.closePolygon)} onClick={() => wayfinding.actions.selectStop(null)}>
              ×
            </button>
          </div>
          <div className="bo-wf__stoppopbtns">
            {selectedStop.temporary && (
              <button type="button" className="bo-wf__smallbtn" onClick={() => wayfinding.actions.editStop(selectedStop.key)}>
                {i18n.t(M.stops.popover.edit)}
              </button>
            )}
            <button type="button" className="bo-wf__smallbtn" onClick={() => wayfinding.actions.armStop(selectedStop.key, selectedStop.levelId, selectedStop.label)}>
              {i18n.t(M.stops.popover.move)}
            </button>
            <button type="button" className="bo-map__unplot" onClick={() => actions.unplotItems([`stop:${selectedStop.key}`])}>
              {i18n.t(M.place.unplot)}
            </button>
            {selectedStop.temporary && (
              <button type="button" className="bo-map__unplot" onClick={() => wayfinding.actions.removeStop(selectedStop.key)}>
                {i18n.t(M.stops.popover.remove)}
              </button>
            )}
          </div>
        </div>
      )}

      {has && (
        <div className="bo-map__zoom" role="group" aria-label={i18n.t(M.plan.zoom)} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className="bo-map__zoombtn" aria-label={i18n.t(M.plan.zoomIn)} title={i18n.t(M.plan.zoomIn)} disabled={view.scale >= MAX_ZOOM} onClick={() => zoomAt(BUTTON_ZOOM_STEP, null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button type="button" className="bo-map__zoombtn" aria-label={i18n.t(M.plan.zoomOut)} title={i18n.t(M.plan.zoomOut)} disabled={view.scale <= MIN_ZOOM} onClick={() => zoomAt(1 / BUTTON_ZOOM_STEP, null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button type="button" className="bo-map__zoombtn" aria-label={i18n.t(M.plan.resetView)} title={i18n.t(M.plan.resetView)} disabled={isDefaultView} onClick={resetView}>
            <ResetViewIcon />
          </button>
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
