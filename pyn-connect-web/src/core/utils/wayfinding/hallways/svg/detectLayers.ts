import type { BBox, HallwayWarning, SvgStructureReport, WalkableShape } from '../types';
import { accumulatedMatrix } from './matrix';
import { localPolylines } from './shapes';
import { contains, descendants, idOf, isHidden, isHiddenInTree, type SvgEl } from './svgTree';

/**
 * Phase 1 of the POC (`detectLayers.ts`): find the layers by id. Every export
 * names the same concept differently (`Walkway` / `Walkways`, `Building
 * Outlines` / `Building_Outlines`), so ids are compared on a normalised form
 * — Illustrator's `_xHH_` escapes and `_000…_` uniqueness suffix decoded,
 * lowercase, runs of `_` / `-` / spaces to one space, a trailing ` <digits>`
 * dropped — and must equal a keyword exactly (`Road Names` is not `Road`).
 *
 * Beyond the POC, the layers corridor inference needs: the building
 * footprints (where people can be) and the rooms inside them (units,
 * amenities, stairs and elevators, garages — where a corridor is not). The
 * CMS's floor files hold every floor of a building and hide all but one with
 * `display="none"`, so hidden subtrees are never read.
 */

const STRONG_WALKABLE = ['walkway', 'walkways', 'sidewalk', 'sidewalks', 'corridor', 'corridors', 'hallway', 'hallways'];
/** Design tools name every unlabelled shape `Path_123`, so `path` counts only when nothing stronger exists. */
const WEAK_WALKABLE = ['path', 'paths'];
const OBSTACLES = ['building outline', 'building outlines', 'office outline', 'office outlines', 'wall', 'walls', 'obstacle', 'obstacles'];
const FOOTPRINTS = ['footprint', 'footprints', 'building footprint', 'building footprints'];
const ROOMS = [
  'units',
  'unit',
  'uncoded units',
  'amenities',
  'amenity',
  'amenities (other)',
  'svg amenities',
  'stairs elevators',
  'stairs',
  'elevators',
  'elevator',
  'garages',
  'garage',
  'empty',
  'balconies',
  'balcony'
];
/** Annotation inside a layer that is not geometry (the POC's `isValidShape` rule). */
const ANNOTATION = /(label|text|icon|legend|compass|callout)/i;
/** A building's outline drawn inside its rooms layer: an envelope, not a room. */
const ENVELOPE = ['outline', 'outlines', ...FOOTPRINTS];

const WALKWAY_TAGS = ['path', 'line', 'polyline', 'polygon'];
const AREA_TAGS = ['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse'];

export const decodeId = (id: string): string =>
  id
    .replace(/_x([0-9A-Fa-f]{2})_/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/_\d{12,}_?$/, '')
    .replace(/_+$/, '');

export const normalizeId = (id: string | null | undefined): string =>
  decodeId(id ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** `POOL_2` and `MAIL_3` are duplicate-instance suffixes, not other concepts. */
export const baseId = (id: string | null | undefined): string => normalizeId(id).replace(/ \d+$/, '');

const matchesAny = (el: SvgEl, keywords: string[]): boolean => keywords.includes(baseId(idOf(el)));

/** Elements with an id, visible, in document order. */
const visibleWithId = (root: SvgEl): SvgEl[] => descendants(root).filter((el) => idOf(el) && !isHiddenInTree(el));

/** The outermost of several matched layers (a match nested in another would be collected twice). */
const outermost = (layers: SvgEl[]): SvgEl[] => layers.filter((el) => !layers.some((other) => other !== el && contains(other, el)));

const isAnnotation = (el: SvgEl) => ANNOTATION.test(normalizeId(idOf(el)));
const isEnvelope = (el: SvgEl) => ENVELOPE.includes(baseId(idOf(el)));

const shapesIn = (layer: SvgEl, root: SvgEl, tags: string[], skip: ((el: SvgEl) => boolean) | null): WalkableShape[] => {
  const out: WalkableShape[] = [];
  const visit = (el: SvgEl) => {
    if (isHidden(el)) return;
    if (skip && el !== layer && skip(el)) return;
    if (el.tag === 'text' || el.tag === 'defs' || el.tag === 'clippath' || el.tag === 'mask' || el.tag === 'pattern' || el.tag === 'symbol') return;
    if (tags.includes(el.tag)) {
      const matrix = accumulatedMatrix(el, root);
      if (el.tag === 'path') {
        const d = el.attrs.d;
        if (d && d.trim()) out.push({ elementId: idOf(el), tagName: el.tag, d, polylines: null, matrix });
      } else {
        const { polylines } = localPolylines(el.tag, el.attrs);
        if (polylines.length) out.push({ elementId: idOf(el), tagName: el.tag, d: null, polylines, matrix });
      }
    }
    el.children.forEach(visit);
  };
  visit(layer);
  return out;
};

const parseViewBox = (root: SvgEl): BBox | null => {
  const raw = root.attrs.viewBox ?? root.attrs.viewbox;
  if (raw) {
    const parts = raw.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) return { minX: parts[0], minY: parts[1], maxX: parts[0] + parts[2], maxY: parts[1] + parts[3] };
  }
  const w = parseFloat(root.attrs.width ?? '');
  const h = parseFloat(root.attrs.height ?? '');
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { minX: 0, minY: 0, maxX: w, maxY: h } : null;
};

/** The structured report: `found` only when a walkway layer with shapes exists — detection never guesses. */
export const detectSvgStructure = (root: SvgEl): SvgStructureReport => {
  const warnings: HallwayWarning[] = [];
  if (descendants(root).some((el) => el.tag === 'svg')) {
    warnings.push({ code: 'nested-svg', message: 'This file contains a nested <svg>; geometry inside it may be misplaced.' });
  }
  const withId = visibleWithId(root);

  let walkwayLayers = withId.filter((el) => matchesAny(el, STRONG_WALKABLE));
  if (!walkwayLayers.length) {
    walkwayLayers = withId.filter((el) => matchesAny(el, WEAK_WALKABLE));
    if (walkwayLayers.length) warnings.push({ code: 'weak-walkway-match', message: `No Walkway / Corridor / Hallway layer; using the generically named "${idOf(walkwayLayers[0])}" layer.` });
  }
  walkwayLayers = outermost(walkwayLayers);
  const obstacleLayers = outermost(withId.filter((el) => matchesAny(el, OBSTACLES)));
  const footprintLayers = outermost(withId.filter((el) => matchesAny(el, FOOTPRINTS)));
  const roomLayers = outermost(withId.filter((el) => matchesAny(el, ROOMS)));

  const walkwayShapes = walkwayLayers.flatMap((layer) => shapesIn(layer, root, WALKWAY_TAGS, null));
  const obstacleShapes = obstacleLayers.flatMap((layer) => shapesIn(layer, root, WALKWAY_TAGS, null));
  const footprintShapes = footprintLayers.flatMap((layer) => shapesIn(layer, root, AREA_TAGS, isAnnotation));
  const roomShapes = roomLayers.flatMap((layer) => shapesIn(layer, root, AREA_TAGS, (el) => isAnnotation(el) || isEnvelope(el)));

  const found = walkwayShapes.length > 0;
  if (!found) warnings.push({ code: 'no-walkable-layer', message: 'No Walkway / Corridor / Hallway / Sidewalk layer in this SVG.' });
  const elementType = !walkwayLayers.length ? 'none' : walkwayLayers.every((el) => el.tag === 'path') ? 'path' : 'group';

  return {
    found,
    walkwayElementType: elementType,
    walkwayLayerIds: walkwayLayers.map(idOf),
    walkwayShapes,
    obstacleShapes,
    footprintShapes,
    roomShapes,
    viewBox: parseViewBox(root) ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    warnings
  };
};
