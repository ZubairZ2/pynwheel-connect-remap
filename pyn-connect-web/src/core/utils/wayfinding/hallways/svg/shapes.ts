import type { Point, RootShape, WalkableShape } from '../types';
import { applyToPoint } from './matrix';
import { DEFAULT_FLATTEN_STEP, parsePathToSubpaths, type Subpath } from './pathData';

/**
 * The POC's `svg/shapeGeometry.ts` and `svg/flattenShapes.ts`: an element's
 * own geometry (line, polyline, polygon closed, rect, circle / ellipse as 24
 * segments; `<path>` goes through the path parser), and a whole layer
 * flattened into root-space subpaths.
 */

const CIRCLE_SAMPLES = 24;

const num = (attrs: Record<string, string>, name: string, fallback = 0): number => {
  const value = parseFloat(attrs[name] ?? '');
  return Number.isFinite(value) ? value : fallback;
};

const parsePoints = (raw: string | undefined): Point[] => {
  const values = (raw ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const points: Point[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
  return points;
};

const ellipse = (cx: number, cy: number, rx: number, ry: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= CIRCLE_SAMPLES; i += 1) {
    const angle = (i / CIRCLE_SAMPLES) * Math.PI * 2;
    points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return points;
};

/** Local-space polylines of a non-path element, and whether its outline closes. */
export const localPolylines = (tag: string, attrs: Record<string, string>): { polylines: Point[][]; closed: boolean } => {
  switch (tag) {
    case 'line':
      return {
        polylines: [
          [
            { x: num(attrs, 'x1'), y: num(attrs, 'y1') },
            { x: num(attrs, 'x2'), y: num(attrs, 'y2') }
          ]
        ],
        closed: false
      };
    case 'polyline': {
      const points = parsePoints(attrs.points);
      return { polylines: points.length >= 2 ? [points] : [], closed: false };
    }
    case 'polygon': {
      const points = parsePoints(attrs.points);
      return { polylines: points.length >= 2 ? [[...points, points[0]]] : [], closed: true };
    }
    case 'rect': {
      const x = num(attrs, 'x');
      const y = num(attrs, 'y');
      const w = num(attrs, 'width');
      const h = num(attrs, 'height');
      if (w <= 0 || h <= 0) return { polylines: [], closed: true };
      return {
        polylines: [
          [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
            { x, y }
          ]
        ],
        closed: true
      };
    }
    case 'circle': {
      const r = num(attrs, 'r');
      return { polylines: r > 0 ? [ellipse(num(attrs, 'cx'), num(attrs, 'cy'), r, r)] : [], closed: true };
    }
    case 'ellipse': {
      const rx = num(attrs, 'rx');
      const ry = num(attrs, 'ry');
      return { polylines: rx > 0 && ry > 0 ? [ellipse(num(attrs, 'cx'), num(attrs, 'cy'), rx, ry)] : [], closed: true };
    }
    default:
      return { polylines: [], closed: false };
  }
};

/** A whole layer's shapes as root-space subpaths (the POC's `flattenShapes`). */
export const flattenShapes = (shapes: WalkableShape[], flattenStep = DEFAULT_FLATTEN_STEP): Subpath[] => {
  const out: Subpath[] = [];
  for (const shape of shapes) {
    if (shape.d) {
      out.push(...parsePathToSubpaths(shape.d, { flattenStep, matrix: shape.matrix }).subpaths);
      continue;
    }
    for (const polyline of shape.polylines ?? []) {
      const mapped = polyline.map((p) => applyToPoint(shape.matrix, p));
      if (mapped.length >= 2) out.push(mapped);
    }
  }
  return out;
};

/**
 * Shapes as root-space outlines for corridor inference: a closed outline
 * (polygon, rect, circle, a path whose subpaths end in Z or meet their start)
 * is an area; anything else is a line.
 */
export const rootShapes = (shapes: WalkableShape[], flattenStep = DEFAULT_FLATTEN_STEP): RootShape[] => {
  const out: RootShape[] = [];
  for (const shape of shapes) {
    if (shape.d) {
      const { subpaths, closed } = parsePathToSubpaths(shape.d, { flattenStep, matrix: shape.matrix });
      const rings: Point[][] = [];
      const lines: Point[][] = [];
      subpaths.forEach((sp, i) => {
        const first = sp[0];
        const last = sp[sp.length - 1];
        const meets = Math.hypot(first.x - last.x, first.y - last.y) < 1e-6;
        if ((closed[i] || meets) && sp.length >= 4) rings.push(sp);
        else lines.push(sp);
      });
      if (rings.length) out.push({ rings, closed: true });
      if (lines.length) out.push({ rings: lines, closed: false });
      continue;
    }
    const polylines = (shape.polylines ?? []).map((polyline) => polyline.map((p) => applyToPoint(shape.matrix, p))).filter((p) => p.length >= 2);
    if (!polylines.length) continue;
    out.push({ rings: polylines, closed: shape.tagName !== 'line' && shape.tagName !== 'polyline' });
  }
  return out;
};
