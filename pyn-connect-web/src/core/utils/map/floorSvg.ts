import type { SvgPointer } from '~/core/models/data/propertyInventory.data';

/**
 * Reading a floor SVG the way the legacy plotting page does
 * (`services/svgHandler.js`, `services/svgAutoPlotting.js`): the document's
 * viewBox is the coordinate space every SVG-mode placement (`pointer_data`)
 * is stored in, and its plottable shapes — the "polygons" the new design
 * drops units and amenities onto — are the shapes the legacy page lets a
 * click land on. Nothing here touches the network or the CMS; the SVG text
 * comes from this app's own `plan-svg` route.
 */

export const SHAPE_TAGS = ['polygon', 'path', 'rect', 'circle', 'ellipse', 'polyline'] as const;

const SHAPE_SELECTOR = SHAPE_TAGS.join(',');

/** Group ids the legacy `isValidShape` rejects a shape under (outlines, labels, text, icons). */
const NOT_PLOTTABLE_GROUP = /outline|label|text|icon/i;

/**
 * The layer groups the legacy `getValidShapeCategory` reads a shape's kind
 * from: an ancestor group named for units, or for amenities.
 */
const UNITS_GROUP = /^units?$/i;
const AMENITIES_GROUP = /^amenit(y|ies)$/i;

/**
 * Ids Illustrator / Figma hand out to shapes it did not name: `Vector_2415`,
 * `Group_12`, `path1234`. They identify the shape, but they are not what the
 * legacy map shows for it.
 */
const GENERIC_ID = /^(vector|group|path|rect|polygon|polyline|shape|layer|clip|mask|g|ellipse|circle)[_\-\s]*\d*$/i;

export type PlotTargetCategory = 'unit' | 'amenity';

export interface SvgViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SvgBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One shape a unit or amenity can be dropped onto. */
export interface PlotTarget {
  /** Unique within the document: the element id, or the selector that finds it. */
  key: string;
  /**
   * What the map calls this polygon: the `<text>` the SVG prints on it (the
   * room number the legacy map shows), else the name of the group it stands
   * in, else the shape's own id — Illustrator escapes decoded.
   */
  code: string;
  /** The polygon sits under a units layer or an amenities layer (legacy `getValidShapeCategory`), when the file has them. */
  category: PlotTargetCategory | null;
  /** The raw `id` attribute of the shape, when it has one. */
  rawId: string | null;
  /** The raw id of the named group the shape stands in, when the group is what names it. */
  groupId: string | null;
  tag: string;
  /** A CSS selector that finds the shape again in the document. */
  selector: string;
  /** The text label the legacy auto-plot matched (the group's `<text>`), when there is one. */
  label: string | null;
  /** Centre of the shape, in viewBox units. */
  cx: number;
  cy: number;
  bbox: SvgBox;
}

export interface FloorSvgDoc {
  viewBox: SvgViewBox;
  targets: PlotTarget[];
  /** Whether the document has a `Units` group (the legacy auto-plot's scope). */
  unitsGroup: boolean;
  text: string;
}

/**
 * Illustrator writes an id that would not be an XML name with `_xHH_`
 * escapes (`_x32_` is "2", `_x31_0` is "10") and appends `_000…_` to make
 * duplicates unique. The stored `pointer_data.id` keeps the raw form; the
 * design's polygon id is the decoded one.
 */
export const decodeIllustratorId = (id: string): string =>
  id
    .replace(/_x([0-9A-Fa-f]{2})_/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/_\d{12,}_?$/, '')
    .replace(/_+$/, '')
    .trim();

const escapeId = (id: string): string => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/([^\w-])/g, '\\$1'));

/** The selector the legacy page builds for a stored pointer (`getPointerIdAndSelector`). */
export const pointerSelector = (pointer: Pick<SvgPointer, 'tag' | 'elementId' | 'selector'>): string | null => {
  if (pointer.tag && pointer.elementId) {
    return /^[0-9]/.test(pointer.elementId) ? `${pointer.tag}[id="${pointer.elementId}"]` : `${pointer.tag}#${escapeId(pointer.elementId)}`;
  }
  return pointer.selector ?? null;
};

export const parseViewBox = (root: Element): SvgViewBox | null => {
  const raw = root.getAttribute('viewBox');
  if (raw) {
    const parts = raw.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }
  const w = parseFloat(root.getAttribute('width') ?? '');
  const h = parseFloat(root.getAttribute('height') ?? '');
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { x: 0, y: 0, w, h } : null;
};

/** The nearest named group that stands for a layer of units or amenities (legacy `getValidShapeCategory`). */
const categoryOf = (element: Element, stopAt: Element): PlotTargetCategory | null => {
  let node: Element | null = element.parentElement;
  while (node && node !== stopAt.parentElement) {
    if (node.tagName.toLowerCase() === 'g' && node.id) {
      const name = decodeIllustratorId(node.id);
      if (UNITS_GROUP.test(name)) return 'unit';
      if (AMENITIES_GROUP.test(name)) return 'amenity';
    }
    node = node.parentElement;
  }
  return null;
};

/** The legacy map's name for a shape: its printed text, else its named group, else its own id. */
const codeOf = (label: string | null, rawId: string | null, group: string | null): string => {
  if (label) return label;
  const own = rawId ? decodeIllustratorId(rawId) : '';
  if (group && (!own || GENERIC_ID.test(rawId ?? ''))) {
    const named = decodeIllustratorId(group);
    if (named && !GENERIC_ID.test(group)) return named;
  }
  return own || (group ? decodeIllustratorId(group) : '');
};

const groupId = (element: Element): string | null => {
  const parent = element.parentElement;
  return parent && parent.tagName.toLowerCase() === 'g' && parent.id ? parent.id : null;
};

const underGroup = (element: Element, test: RegExp, stopAt: Element): boolean => {
  let node: Element | null = element.parentElement;
  while (node && node !== stopAt) {
    if (node.tagName.toLowerCase() === 'g' && node.id && test.test(node.id)) return true;
    node = node.parentElement;
  }
  return false;
};

const hidden = (element: Element): boolean => {
  const style = element.getAttribute('style') ?? '';
  return element.getAttribute('display') === 'none' || /display\s*:\s*none/.test(style) || /visibility\s*:\s*hidden/.test(style);
};

const textLabel = (element: Element): string | null => {
  const parent = element.parentElement;
  const text = parent?.querySelector(':scope > text');
  const value = text?.textContent?.replace(/\s+/g, ' ').trim();
  return value || null;
};

/** The shape's box in the root's user units, whatever transforms sit between. */
const rootBox = (svg: SVGSVGElement, shape: SVGGraphicsElement): SvgBox | null => {
  let box: DOMRect;
  try {
    box = shape.getBBox();
  } catch {
    return null;
  }
  if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) return null;
  const matrix = shape.getCTM();
  if (!matrix) return { x: box.x, y: box.y, w: box.width, h: box.height };
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height]
  ].map(([x, y]) => {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    return point.matrixTransform(matrix);
  });
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
};

/**
 * The plottable shapes of a mounted SVG: every shape with an id (the ids
 * are the room numbers in the CMS's floor files), plus every named group
 * that holds shapes without ids of their own (`g#R-112 > polygon`, the form
 * the legacy auto-plot saves). Inside the `Units` and `Amenities` layers
 * when the file has them (the two layers the legacy page plots onto);
 * artwork layers are left out otherwise. Each target's `code` is what the
 * legacy map prints for it: the group's `<text>`, else the group's name.
 */
export const collectTargets = (svg: SVGSVGElement): { targets: PlotTarget[]; unitsGroup: boolean } => {
  const groups = Array.from(svg.querySelectorAll('g[id]'));
  const units = groups.find((group) => UNITS_GROUP.test(decodeIllustratorId(group.id))) ?? null;
  const amenities = groups.find((group) => AMENITIES_GROUP.test(decodeIllustratorId(group.id))) ?? null;
  const scopes: Element[] = [units, amenities].filter((group): group is Element => !!group);
  if (!scopes.length) scopes.push(svg);
  const targets: PlotTarget[] = [];
  const seen = new Set<Element>();

  const push = (scope: Element, shape: Element, rawId: string | null, group: string | null, selector: string) => {
    if (seen.has(shape) || hidden(shape)) return;
    const label = textLabel(shape);
    const code = codeOf(label, rawId, group);
    if (!code) return;
    const box = rootBox(svg, shape as SVGGraphicsElement);
    if (!box || (box.w <= 0 && box.h <= 0)) return;
    seen.add(shape);
    targets.push({
      key: rawId ?? selector,
      code,
      category: categoryOf(shape, scope),
      rawId,
      groupId: group,
      tag: shape.tagName.toLowerCase(),
      selector,
      label,
      cx: box.x + box.w / 2,
      cy: box.y + box.h / 2,
      bbox: box
    });
  };

  scopes.forEach((scope) => {
    scope.querySelectorAll(SHAPE_SELECTOR).forEach((shape) => {
      if (!shape.id) return;
      if (underGroup(shape, NOT_PLOTTABLE_GROUP, scope)) return;
      const tag = shape.tagName.toLowerCase();
      push(scope, shape, shape.id, groupId(shape), /^[0-9]/.test(shape.id) ? `${tag}[id="${shape.id}"]` : `${tag}#${escapeId(shape.id)}`);
    });

    scope.querySelectorAll('g[id]').forEach((group) => {
      if (group === units || group === amenities) return;
      if (underGroup(group, NOT_PLOTTABLE_GROUP, scope) || NOT_PLOTTABLE_GROUP.test(group.id)) return;
      if (group.querySelector(`${SHAPE_SELECTOR.split(',').map((tag) => `${tag}[id]`).join(',')}`)) return;
      const child = Array.from(group.children).find((node) => (SHAPE_TAGS as readonly string[]).includes(node.tagName.toLowerCase()));
      if (!child) return;
      const tag = child.tagName.toLowerCase();
      push(scope, child, null, group.id, `g[id="${group.id}"] > ${tag}`);
    });
  });

  return { targets, unitsGroup: !!units };
};

/**
 * Parses the SVG text, mounts it off-screen at its own size so `getBBox`
 * answers in viewBox units, reads its plottable shapes, and unmounts it.
 * Browser only.
 */
export const measureFloorSvg = (text: string): FloorSvgDoc => {
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('not an SVG document');
  }
  const viewBox = parseViewBox(root);
  if (!viewBox) throw new Error('the SVG has no size');

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
  const svg = document.importNode(root, true) as unknown as SVGSVGElement;
  svg.setAttribute('width', String(viewBox.w));
  svg.setAttribute('height', String(viewBox.h));
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  host.appendChild(svg);
  document.body.appendChild(host);
  try {
    const { targets, unitsGroup } = collectTargets(svg);
    return { viewBox, targets, unitsGroup, text };
  } finally {
    document.body.removeChild(host);
  }
};

/**
 * The target a stored pointer points at: by the element id the CMS saved,
 * else by its selector, else the shape nearest the saved position.
 */
export const pointerTarget = (doc: FloorSvgDoc, pointer: SvgPointer): PlotTarget | null => {
  if (pointer.elementId) {
    const byId = doc.targets.find((target) => target.rawId === pointer.elementId);
    if (byId) return byId;
  }
  if (pointer.selector) {
    const group = selectorGroup(pointer.selector);
    const bySelector = doc.targets.find((target) => target.selector === pointer.selector || (group != null && target.groupId === group));
    if (bySelector) return bySelector;
  }
  let best: PlotTarget | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  doc.targets.forEach((target) => {
    const d = Math.hypot(target.cx - pointer.xPlot, target.cy - pointer.yPlot);
    if (d < bestDistance) {
      bestDistance = d;
      best = target;
    }
  });
  // Only a shape the point actually sits in counts as "this polygon".
  if (best) {
    const target = best as PlotTarget;
    const inside =
      pointer.xPlot >= target.bbox.x - 1 &&
      pointer.xPlot <= target.bbox.x + target.bbox.w + 1 &&
      pointer.yPlot >= target.bbox.y - 1 &&
      pointer.yPlot <= target.bbox.y + target.bbox.h + 1;
    return inside ? target : null;
  }
  return null;
};

/** `g#R-112 > polygon:nth-child(1)` → `R-112`. */
const selectorGroup = (selector: string): string | null => {
  const match = /^g#([^\s>]+)/.exec(selector) ?? /^g\[id="([^"]+)"\]/.exec(selector);
  return match ? match[1].replace(/\\(.)/g, '$1') : null;
};

/** viewBox units → percent of the document, for absolutely positioned overlays. */
export const toViewBoxPercent = (viewBox: SvgViewBox, x: number, y: number): { xPct: number; yPct: number } => ({
  xPct: ((x - viewBox.x) / viewBox.w) * 100,
  yPct: ((y - viewBox.y) / viewBox.h) * 100
});
