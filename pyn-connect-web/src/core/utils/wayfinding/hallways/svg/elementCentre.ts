import type { Point } from '../types';
import { accumulatedMatrix } from './matrix';
import { rootShapes } from './shapes';
import { descendants, idOf, type SvgEl } from './svgTree';

const SHAPES = ['path', 'polygon', 'polyline', 'rect', 'circle', 'ellipse', 'line'];

/**
 * Where a plotted polygon is, from the SVG itself: the centre of the
 * geometry of the element a stored pointer (`pointer_data.id`, else its
 * selector) or a page drop names. The CMS's own `x_plot` / `y_plot` for a
 * pointer can sit away from that polygon, while the canvas fills the polygon
 * by id — so the polygon is where a unit joins the paths.
 */
export const elementCentres = (root: SvgEl): ((elementId: string | null, selector: string | null) => Point | null) => {
  const byId = new Map<string, SvgEl>();
  descendants(root).forEach((el) => {
    const id = idOf(el);
    if (id && !byId.has(id)) byId.set(id, el);
  });
  const cache = new Map<SvgEl, Point | null>();
  const centreOf = (el: SvgEl): Point | null => {
    if (cache.has(el)) return cache.get(el)!;
    const shapes = [el, ...descendants(el)].filter((node) => SHAPES.includes(node.tag));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const shape of shapes) {
      const matrix = accumulatedMatrix(shape, root);
      const geometry = shape.tag === 'path' ? { elementId: '', tagName: 'path', d: shape.attrs.d ?? '', polylines: null, matrix } : null;
      const list = geometry
        ? rootShapes([geometry])
        : rootShapes([{ elementId: '', tagName: shape.tag, d: null, polylines: null, matrix }].map((row) => ({ ...row, polylines: polylinesOf(shape) })));
      for (const item of list)
        for (const ring of item.rings)
          for (const p of ring) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
    }
    const centre = Number.isFinite(minX) ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : null;
    cache.set(el, centre);
    return centre;
  };
  const idInSelector = (selector: string): string | null => {
    const match = /\[id="([^"]+)"\]/.exec(selector) ?? /#((?:\\.|[^\s>:.[])+)/.exec(selector);
    return match ? match[1].replace(/\\(.)/g, '$1') : null;
  };
  return (elementId, selector) => {
    const direct = elementId ? byId.get(elementId) : null;
    if (direct) return centreOf(direct);
    const key = selector ?? elementId;
    if (!key) return null;
    const id = idInSelector(key);
    const named = id ? byId.get(id) : null;
    return named ? centreOf(named) : null;
  };
};

const polylinesOf = (shape: SvgEl): Point[][] => {
  const num = (name: string) => {
    const value = parseFloat(shape.attrs[name] ?? '');
    return Number.isFinite(value) ? value : 0;
  };
  switch (shape.tag) {
    case 'rect': {
      const x = num('x');
      const y = num('y');
      const w = num('width');
      const h = num('height');
      return w > 0 && h > 0 ? [[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]] : [];
    }
    case 'circle':
    case 'ellipse': {
      const rx = shape.tag === 'circle' ? num('r') : num('rx');
      const ry = shape.tag === 'circle' ? num('r') : num('ry');
      const cx = num('cx');
      const cy = num('cy');
      return rx > 0 && ry > 0 ? [[{ x: cx - rx, y: cy - ry }, { x: cx + rx, y: cy + ry }]] : [];
    }
    case 'line':
      return [[{ x: num('x1'), y: num('y1') }, { x: num('x2'), y: num('y2') }]];
    default: {
      const values = (shape.attrs.points ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      const points: Point[] = [];
      for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
      return points.length >= 2 ? [points] : [];
    }
  }
};
