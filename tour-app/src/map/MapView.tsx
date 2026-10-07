import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Icon } from '~/components/Icon';
import type { Amenity, GraphEdge, GraphNode, MapLevel, Route, Unit } from '~/models';
import { centreOf } from '~/wayfinding/graphIndex';
import type { WalkerPosition } from '~/wayfinding/simulation';
import { FROM_COLOR, NETWORK_COLOR, ROUTE_CASING, ROUTE_COLOR, TO_COLOR, symbolOf } from './mapSymbols';
import { svgPlacement } from './mapBase';
import { useLevelBase, type BaseErrorKind } from './useLevelBase';
import { useMapViewport, type Box } from './useMapViewport';

/**
 * The map: one level at one floor, in layers —
 *
 *   plan: the floor SVG (through the API) or the floor image, in the level's frame (`mapBase.ts`);
 *         demo levels draw their inline vector plan instead
 *   ↓ while the plan loads a veil says so; when it cannot load, an explicit "Map unavailable" / "Invalid SVG" state
 *   ↓ unit and amenity footprints (highlighted when they are a route end or the current stop)
 *   ↓ hallway network (paths and points, shown faintly when asked)
 *   ↓ stops: entries, exits, elevators, stairs, doors, blockers, destinations — each with its glyph
 *   ↓ the route on this floor (green with a white casing, dashed where it continues on another floor)
 *   ↓ From / To markers and the transition badges ("Elevator A → Floor 3")
 *   ↓ the Play Route walker
 *
 * Only the selected floor's data is rendered: a stacked plate shows the
 * units of that floor alone, exactly as the backend's per-floor copies.
 */

export interface MapHighlight {
  from?: string | null;
  to?: string | null;
  current?: string | null;
}

interface Props {
  level: MapLevel;
  floor: number | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  units: Unit[];
  amenities: Amenity[];
  route?: Route | null;
  walker?: WalkerPosition | null;
  highlight?: MapHighlight;
  showNetwork?: boolean;
  /** `route` frames the route's part on this floor; `all` frames the level. */
  fitTo?: 'route' | 'all';
  /** Re-fit when this changes (a new route, a new stage). */
  fitKey?: string;
  followWalker?: boolean;
  onTapNode?: (node: GraphNode) => void;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
}

const pointsOf = (polygon: [number, number][]) => polygon.map((p) => p.join(',')).join(' ');

const onFloor = (floor: number | null, nodeFloor: number | null) => floor == null || nodeFloor == null || nodeFloor === floor;

const bboxOf = (points: [number, number][]): Box | null => {
  if (!points.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  points.forEach(([x, y]) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  });
  const pad = 60;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
};

const ZOOM_STEP = 1.4;

const BASE_ERROR_TEXT: Record<BaseErrorKind, { title: string; body: string }> = {
  unavailable: { title: 'Map unavailable', body: 'The floor plan could not be loaded from the server.' },
  invalid: { title: 'Invalid floor plan', body: 'The stored floor plan is not a valid SVG file.' },
  network: { title: 'Map unavailable', body: 'Check your connection and try again.' },
  none: { title: 'No floor plan', body: 'This level has no floor plan in Pynwheel yet.' }
};

export const MapView = ({ level, floor, nodes, edges, units, amenities, route, walker, highlight, showNetwork = false, fitTo = 'route', fitKey, followWalker = false, onTapNode, children, className, style, loading }: Props) => {
  const base = useLevelBase(level);
  const frameWidth = base.frame.width || level.width;
  const frameHeight = base.frame.height || level.height;
  const { container, viewport, fit, centerOn, zoomAt, wasTap, handlers } = useMapViewport(frameWidth, frameHeight);

  const levelNodes = useMemo(() => nodes.filter((n) => n.level === level.id && onFloor(floor, n.floor)), [nodes, level.id, floor]);
  const levelEdges = useMemo(() => edges.filter((e) => e.level === level.id), [edges, level.id]);
  const levelUnits = useMemo(() => units.filter((u) => u.level === level.id && onFloor(floor, u.floor) && u.polygon), [units, level.id, floor]);
  const levelAmenities = useMemo(() => amenities.filter((a) => a.level === level.id && onFloor(floor, a.floor) && a.polygon), [amenities, level.id, floor]);

  /** The route's walk legs on this level and floor, and the outdoor leg when this is the site plan. */
  const routeHere = useMemo(() => {
    if (!route) return { lines: [] as [number, number][][], transitions: [] as { at: [number, number]; label: string; kind: string }[], ends: [] as { at: [number, number]; which: 'from' | 'to' }[] };
    const lines: [number, number][][] = [];
    const transitions: { at: [number, number]; label: string; kind: string }[] = [];
    const ends: { at: [number, number]; which: 'from' | 'to' }[] = [];
    route.legs.forEach((leg, i) => {
      if (leg.kind === 'walk') {
        if (leg.level !== level.id || !onFloor(floor, leg.floor)) return;
        lines.push(leg.points);
        if (i === 0) ends.push({ at: leg.points[0], which: 'from' });
        if (i === route.legs.length - 1) ends.push({ at: leg.points[leg.points.length - 1], which: 'to' });
        const next = route.legs[i + 1];
        const previous = route.legs[i - 1];
        if (next && next.kind !== 'walk') {
          const label = next.kind === 'outdoor' ? 'Walk outside' : `${next.name ?? next.kind} → Floor ${next.floorTo ?? '?'}`;
          transitions.push({ at: leg.points[leg.points.length - 1], label, kind: next.kind });
        }
        if (previous && previous.kind !== 'walk') {
          const label = previous.kind === 'outdoor' ? 'Arrive from outside' : `From Floor ${previous.floorFrom ?? '?'}`;
          transitions.push({ at: leg.points[0], label, kind: previous.kind });
        }
      } else if (leg.kind === 'outdoor' && leg.level === level.id && leg.points) {
        lines.push(leg.points);
        transitions.push({ at: leg.points[0], label: (leg.name ?? '|').split('|')[0] || 'Exit', kind: 'exit' });
        transitions.push({ at: leg.points[leg.points.length - 1], label: (leg.name ?? '|').split('|')[1] || 'Entrance', kind: 'entry' });
      }
    });
    return { lines, transitions, ends };
  }, [route, level.id, floor]);

  // Frame the map when the level, floor or route changes.
  const fitSignature = `${level.id}@${floor ?? ''}|${fitTo}|${fitKey ?? ''}|${route ? route.from + route.to + route.lengthPx : ''}|${frameWidth}x${frameHeight}`;
  const lastFit = useRef('');
  const initialFit = useCallback(() => {
    const points = routeHere.lines.flat();
    const box = fitTo === 'route' ? bboxOf(points) : null;
    fit(box ?? { x: 0, y: 0, w: frameWidth, h: frameHeight }, 14, box ? 1.7 : 1);
  }, [routeHere.lines, fitTo, fit, frameWidth, frameHeight]);
  useEffect(() => {
    if (lastFit.current === fitSignature) return;
    lastFit.current = fitSignature;
    initialFit();
    const id = window.setTimeout(initialFit, 60);
    return () => window.clearTimeout(id);
  }, [fitSignature, initialFit]);

  // Keep the walker in view while it plays.
  useEffect(() => {
    if (!followWalker || !walker || walker.x == null || walker.y == null || walker.level !== level.id) return;
    const el = container.current;
    if (!el) return;
    const sx = walker.x * viewport.scale + viewport.tx;
    const sy = walker.y * viewport.scale + viewport.ty;
    const margin = 48;
    if (sx < margin || sy < margin || sx > el.clientWidth - margin || sy > el.clientHeight - margin) centerOn(walker.x, walker.y);
  }, [walker, followWalker, level.id, viewport, centerOn, container]);

  const markerScale = Math.max(0.55, Math.min(1.6, 1 / viewport.scale));
  const highlightKey = `${highlight?.from ?? ''}|${highlight?.to ?? ''}|${highlight?.current ?? ''}`;
  const geometry = level.svg;

  // Everything but the walker is memoized: a Play Route frame re-renders one <g>, not the plan.
  const staticLayers = useMemo(() => {
    const highlightSet = new Set(highlightKey.split('|').filter(Boolean));
    return (
      <>
          {/* The plan itself (the floor SVG or image) is the separate layer below; demo levels draw their inline vector plan here */}
          {geometry?.shapes.map((shape) => {
            if (shape.kind === 'label') {
              return (
                <text key={shape.id} x={shape.at?.[0]} y={shape.at?.[1]} className={`pw-map__label${level.kind === 'sitemap' ? ' pw-map__label--site' : ''}`} textAnchor="middle">
                  {shape.text}
                </text>
              );
            }
            if (shape.ref && (levelUnits.some((u) => u.node === shape.ref) || levelAmenities.some((a) => a.node === shape.ref))) return null;
            if (shape.ref && !levelNodes.some((n) => n.id === shape.ref)) return null;
            return <polygon key={shape.id} points={pointsOf(shape.points)} className={`pw-map__shape pw-map__shape--${shape.kind}`} />;
          })}

          {/* Units and amenities */}
          {levelUnits.map((u) => (
            <g key={u.node} className={`pw-map__unit${u.available ? '' : ' pw-map__unit--leased'}${highlightSet.has(u.node) ? ' pw-map__unit--hot' : ''}`} onClick={() => wasTap() && onTapNode?.(levelNodes.find((n) => n.id === u.node)!)}>
              <polygon points={pointsOf(u.polygon!)} />
              <text x={u.polygon![0][0] + (u.polygon![1][0] - u.polygon![0][0]) / 2} y={u.polygon![0][1] + (u.polygon![2][1] - u.polygon![0][1]) / 2} textAnchor="middle" className="pw-map__roomlabel">
                {u.name.replace(/ \*$/, '')}
              </text>
            </g>
          ))}
          {levelAmenities.map((a) => (
            <g key={a.node} className={`pw-map__amenity${highlightSet.has(a.node) ? ' pw-map__amenity--hot' : ''}`} onClick={() => wasTap() && onTapNode?.(levelNodes.find((n) => n.id === a.node)!)}>
              <polygon points={pointsOf(a.polygon!)} />
              <text x={a.polygon![0][0] + (a.polygon![1][0] - a.polygon![0][0]) / 2} y={a.polygon![0][1] + (a.polygon![2][1] - a.polygon![0][1]) / 2} textAnchor="middle" className="pw-map__roomlabel">
                {a.name.replace(/ \*$/, '')}
              </text>
            </g>
          ))}

          {/* Hallway network */}
          {showNetwork
            ? levelEdges.map((e) => <polyline key={`${e.from}-${e.to}`} points={pointsOf(e.polyline)} fill="none" stroke={NETWORK_COLOR} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />)
            : null}
          {showNetwork
            ? levelNodes
                .filter((n) => n.kind === 'hallway')
                .map((n) => {
                  const [x, y] = centreOf(n, floor);
                  return <circle key={`${n.id}@${n.level}`} cx={x} cy={y} r={4} fill="#fff" stroke={NETWORK_COLOR} strokeWidth={2} />;
                })
            : null}

          {/* Route */}
          {routeHere.lines.map((line, i) => (
            <g key={`route-${i}`} className="pw-map__route">
              <polyline points={pointsOf(line)} fill="none" stroke={ROUTE_CASING} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={pointsOf(line)} fill="none" stroke={ROUTE_COLOR} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={pointsOf(line)} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 14" className="pw-map__routeflow" />
            </g>
          ))}

          {/* Stops */}
          {levelNodes
            .filter((n) => n.kind !== 'hallway' && n.kind !== 'unit' && n.kind !== 'amenity' && n.kind !== 'door')
            .map((n) => {
              const symbol = symbolOf(n);
              const [x, y] = centreOf(n, floor);
              const hot = highlightSet.has(n.id);
              return (
                <g key={`${n.id}@${n.level}`} transform={`translate(${x} ${y}) scale(${markerScale})`} className={`pw-map__stop${hot ? ' pw-map__stop--hot' : ''}`} onClick={() => wasTap() && onTapNode?.(n)}>
                  {n.kind === 'blocker' ? <circle r={(n.radiusPx ?? 30) / markerScale} fill="rgba(198,37,52,0.12)" stroke="#C62534" strokeWidth={1.5} strokeDasharray="4 4" /> : null}
                  <circle r={13} fill={symbol.color} stroke="#fff" strokeWidth={2.5} />
                  <g transform="translate(-7 -7) scale(0.58)">
                    <path d={glyphPath(symbol.icon)} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  {n.name && n.kind !== 'blocker' ? (
                    <text y={26} textAnchor="middle" className="pw-map__stoplabel">
                      {n.name.replace(/ \*$/, '')}
                    </text>
                  ) : null}
                </g>
              );
            })}

          {/* Transition badges and route ends */}
          {routeHere.transitions.map((t, i) => (
            <g key={`t-${i}`} transform={`translate(${t.at[0]} ${t.at[1]}) scale(${markerScale})`} className="pw-map__badge">
              <circle r={9} fill="#fff" stroke={ROUTE_COLOR} strokeWidth={2.5} />
              <text y={-16} textAnchor="middle">
                {t.label.replace(/ \*/g, '')}
              </text>
            </g>
          ))}
          {routeHere.ends.map((e) => (
            <g key={e.which} transform={`translate(${e.at[0]} ${e.at[1]}) scale(${markerScale})`} className="pw-map__end">
              {e.which === 'from' ? <circle r={10} fill={FROM_COLOR} stroke="#fff" strokeWidth={3} /> : <rect x={-9} y={-9} width={18} height={18} rx={3} fill={TO_COLOR} stroke="#fff" strokeWidth={3} />}
            </g>
          ))}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wasTap reads a ref; the rest are the layer inputs
  }, [level, floor, geometry, levelUnits, levelAmenities, levelNodes, levelEdges, showNetwork, routeHere, highlightKey, markerScale, onTapNode]);

  // The plan is painted once into its own compositing layer: the animated route dashes, the walker's
  // pulse and the per-frame walker updates repaint the overlay only, never the (possibly multi-megabyte)
  // floor plan. Pan and zoom move both layers with one GPU transform on the plane.
  const planLayer = useMemo(() => {
    if (base.kind === 'svg' && base.svgUrl && base.viewBox) {
      const placement = svgPlacement(base.frame, base.viewBox, level.svgTransform);
      return <image href={base.svgUrl} x={placement.x} y={placement.y} width={placement.width} height={placement.height} preserveAspectRatio={placement.preserveAspectRatio} transform={placement.transform ?? undefined} data-plan="svg" />;
    }
    if (base.kind === 'image' && base.imageUrl) return <image href={base.imageUrl} x={0} y={0} width={frameWidth} height={frameHeight} preserveAspectRatio="none" data-plan="image" />;
    return <rect x={0} y={0} width={frameWidth} height={frameHeight} fill="#F6F7F8" data-plan={geometry ? 'vector' : 'none'} />;
  }, [base.kind, base.svgUrl, base.viewBox, base.imageUrl, base.frame, level.svgTransform, frameWidth, frameHeight, geometry]);

  return (
    <div ref={container} className={`pw-map${className ? ` ${className}` : ''}`} style={style} {...handlers} role="img" aria-label={`${level.name}${floor != null ? `, floor ${floor}` : ''} map`}>
      <div className="pw-map__plane" style={{ transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})` }}>
        <svg className="pw-map__svg pw-map__svg--plan" width={frameWidth} height={frameHeight} viewBox={`0 0 ${frameWidth} ${frameHeight}`} aria-hidden>
          {planLayer}
        </svg>
        <svg className="pw-map__svg pw-map__svg--overlay" width={frameWidth} height={frameHeight} viewBox={`0 0 ${frameWidth} ${frameHeight}`} data-base={base.status} data-base-kind={base.kind ?? ''}>
          {staticLayers}
          {/* Walker */}
          {walker && walker.level === level.id && walker.x != null && walker.y != null && onFloor(floor, walker.floor) ? (
            <g transform={`translate(${walker.x} ${walker.y}) scale(${markerScale})`} className="pw-map__walker">
              <circle r={20} className="pw-map__walkerpulse" />
              <circle r={9} fill="#0077AE" stroke="#fff" strokeWidth={3} />
            </g>
          ) : null}
        </svg>
      </div>
      {loading || base.status === 'loading' ? (
        <div className="pw-map__veil" role="status" aria-live="polite">
          <span className="pw-spinner" />
          <span className="pw-map__veiltext">{base.status === 'loading' ? 'Loading map…' : 'Calculating…'}</span>
        </div>
      ) : null}
      {base.status === 'error' && base.error ? (
        <div className="pw-map__error" role="alert">
          <strong>{BASE_ERROR_TEXT[base.error].title}</strong>
          <span>{BASE_ERROR_TEXT[base.error].body}</span>
        </div>
      ) : null}
      {/* The controls stop the pointer before the map's gesture handlers: a tap here is a button press, never a map tap. */}
      <div className="pw-map__zoom" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(ZOOM_STEP, (container.current?.clientWidth ?? 0) / 2, (container.current?.clientHeight ?? 0) / 2)}>
          <Icon name="plus" size={14} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / ZOOM_STEP, (container.current?.clientWidth ?? 0) / 2, (container.current?.clientHeight ?? 0) / 2)}>
          <Icon name="minus" size={14} />
        </button>
        <button type="button" aria-label="Reset view" onClick={initialFit}>
          <Icon name="crosshair" size={14} />
        </button>
      </div>
      {children}
    </div>
  );
};

/** The stop glyph paths, duplicated from the Icon map for the SVG layer (SVG cannot nest the component's `<svg>` cheaply). */
const glyphPath = (name: string): string =>
  ({
    entry: 'M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4',
    exit: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    elevator: 'M5 3h14v18H5zM9 10l3-3 3 3M9 14l3 3 3-3',
    stairs: 'M3 20h5v-5h5v-5h5V5h3',
    ramp: 'M3 19h18V8z',
    door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01',
    blocker: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM5.6 5.6l12.8 12.8',
    leasing: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6',
    restroom: 'M12 3v18M7 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM17 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM5 11h4v10M15 11h4v10',
    mail: 'M3 6h18v13H3zM3 6l9 7 9-7',
    parking: 'M5 3h14v18H5zM10 17V7h3a3 3 0 0 1 0 6h-3',
    waypoint: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z',
    pin: 'M12 21s7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 7 12 7 12ZM12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    unit: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
    amenity: 'M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z'
  })[name] ?? 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z';
