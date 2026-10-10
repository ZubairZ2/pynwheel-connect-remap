import type { BBox, HallwayWarning, Matrix2D, SvgStructureReport, WalkableShape } from '../types';
import { IDENTITY, accumulatedMatrix, multiply } from './matrix';
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
 *
 * Two things the real Pynwheel exports taught (October 2026):
 *
 *   - a Beans / Figma export draws the footprint of each building as its
 *     `Building_outline` (a filled path), never as a `Footprints` layer; when
 *     a file has no footprints layer, its building outlines are the footprints
 *     corridor inference reads (and still the obstacles a synthesised link
 *     must not cross);
 *   - a Beans property's floor files hold the units and amenities only — the
 *     walkways (`Path`, a stroked sidewalk centreline) and the building
 *     outlines live in the one shared background map the property keeps. So
 *     a structure can be read from a floor file *and* its background: the
 *     background's walkways and footprints fill in what the floor file lacks,
 *     mapped into the floor's frame through the two files' viewBoxes.
 */

const STRONG_WALKABLE = ['walkway', 'walkways', 'sidewalk', 'sidewalks', 'corridor', 'corridors', 'hallway', 'hallways'];
/** Design tools name every unlabelled shape `Path_123`, so `path` counts only when nothing stronger exists. */
const WEAK_WALKABLE = ['path', 'paths', 'pathway', 'pathways'];
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
/** Ids design tools hand out to what nobody named: not a layer. */
const GENERIC_ID = /^(vector|group|path|rect|rectangle|polygon|polyline|ellipse|circle|line|g|layer|frame|shape|clip|clippath|mask|image|pattern|filter|svg|text|tspan|use|defs)( \d+)?$/;
const DEFS_ID = /^(clip|mask|pattern|filter|image)\d/;

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

/** `Building_outline`, `Building Outlines`, `Outline Floor 1`, `Outlines`: the drawn edge of a building. */
const isOutline = (el: SvgEl): boolean => {
  const base = baseId(idOf(el));
  return ENVELOPE.includes(base) || OBSTACLES.slice(0, 4).includes(base) || base.startsWith('outline ') || base.endsWith(' outline') || base.endsWith(' outlines');
};

/** Elements with an id, visible, in document order. */
const visibleWithId = (root: SvgEl): SvgEl[] => descendants(root).filter((el) => idOf(el) && !isHiddenInTree(el));

/** The outermost of several matched layers (a match nested in another would be collected twice). */
const outermost = (layers: SvgEl[]): SvgEl[] => layers.filter((el) => !layers.some((other) => other !== el && contains(other, el)));

const isAnnotation = (el: SvgEl) => ANNOTATION.test(normalizeId(idOf(el)));
const isEnvelope = (el: SvgEl) => ENVELOPE.includes(baseId(idOf(el)));

const inDefs = (el: SvgEl): boolean => {
  let node: SvgEl | null = el.parent;
  while (node) {
    if (node.tag === 'defs') return true;
    node = node.parent;
  }
  return false;
};

/** Named layers the file has: groups and shapes someone named, outside `<defs>`; what a flattened export has none of. */
const namedLayerCount = (withId: SvgEl[]): number =>
  withId.filter((el) => (el.tag === 'g' || AREA_TAGS.includes(el.tag)) && !inDefs(el) && !GENERIC_ID.test(baseId(idOf(el))) && !DEFS_ID.test(normalizeId(idOf(el)))).length;

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

/** The structure of one file: `found` only when a walkway layer with shapes exists — detection never guesses. */
const structureOf = (root: SvgEl): SvgStructureReport => {
  const warnings: HallwayWarning[] = [];
  if (descendants(root).some((el) => el.tag === 'svg')) {
    warnings.push({ code: 'nested-svg', message: 'This file contains a nested <svg>; geometry inside it may be misplaced.' });
  }
  const withId = visibleWithId(root);

  let walkwayLayers = withId.filter((el) => matchesAny(el, STRONG_WALKABLE));
  let walkwayMatch: SvgStructureReport['walkwayMatch'] = walkwayLayers.length ? 'strong' : 'none';
  if (!walkwayLayers.length) {
    walkwayLayers = withId.filter((el) => matchesAny(el, WEAK_WALKABLE));
    if (walkwayLayers.length) {
      walkwayMatch = 'weak';
      warnings.push({ code: 'weak-walkway-match', message: `No Walkway / Corridor / Hallway layer; using the generically named "${idOf(walkwayLayers[0])}" layer.` });
    }
  }
  walkwayLayers = outermost(walkwayLayers);
  const obstacleLayers = outermost(withId.filter((el) => matchesAny(el, OBSTACLES)));
  let footprintLayers = outermost(withId.filter((el) => matchesAny(el, FOOTPRINTS)));
  let footprintSource: SvgStructureReport['footprintSource'] = footprintLayers.length ? 'footprints' : null;
  if (!footprintLayers.length) {
    // No footprints layer: the building outlines are the footprints (a filled outline is the building's area; a stroked one its edge).
    footprintLayers = outermost(withId.filter(isOutline).filter((el) => !walkwayLayers.some((layer) => contains(layer, el))));
    if (footprintLayers.length) footprintSource = 'outlines';
  }
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
    walkwayMatch: found ? walkwayMatch : 'none',
    walkwayElementType: elementType,
    walkwayLayerIds: walkwayLayers.map(idOf),
    walkwayShapes,
    obstacleShapes,
    footprintShapes: footprintShapes.length ? footprintShapes : [],
    roomShapes,
    viewBox: parseViewBox(root) ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    warnings,
    namedLayers: namedLayerCount(withId),
    footprintSource: footprintShapes.length ? footprintSource : null,
    fromBackground: { walkways: false, footprints: false, obstacles: false }
  };
};

/** The transform that takes a point of the background's viewBox to the same place in the floor's: the two files are shown in one box. */
export const viewBoxMap = (from: BBox, to: BBox): Matrix2D => {
  const a = (to.maxX - to.minX) / (from.maxX - from.minX);
  const d = (to.maxY - to.minY) / (from.maxY - from.minY);
  if (Math.abs(a - 1) < 1e-9 && Math.abs(d - 1) < 1e-9 && Math.abs(to.minX - from.minX) < 1e-9 && Math.abs(to.minY - from.minY) < 1e-9) return IDENTITY;
  return { a, b: 0, c: 0, d, e: to.minX - from.minX * a, f: to.minY - from.minY * d };
};

/**
 * The structured report of a floor file, and — for a property whose floor
 * files overlay one shared background map — of the floor file with the
 * background's walkways, footprints and obstacles filling in what the floor
 * file lacks. The floor's own layers always win; the background's shapes are
 * brought into the floor's frame through the two viewBoxes. `found` only when
 * a walkway layer with shapes exists in either — detection never guesses.
 */
export const detectSvgStructure = (root: SvgEl, background: SvgEl | null = null): SvgStructureReport => {
  const own = structureOf(root);
  if (!background) return own;
  const bg = structureOf(background);
  const map = viewBoxMap(bg.viewBox, own.viewBox);
  const remap = (shapes: WalkableShape[]): WalkableShape[] => (map === IDENTITY ? shapes : shapes.map((shape) => ({ ...shape, matrix: multiply(map, shape.matrix) })));

  const walkways = !own.found && bg.found;
  const footprints = !own.footprintShapes.length && bg.footprintShapes.length > 0;
  const warnings = own.warnings.filter((warning) => !(walkways && warning.code === 'no-walkable-layer'));
  if (walkways) {
    bg.warnings.filter((warning) => warning.code === 'weak-walkway-match').forEach((warning) => warnings.push({ ...warning, message: `${warning.message} (shared background map)` }));
    warnings.push({ code: 'walkway-from-background', message: `The walkways were read from the shared background map (${bg.walkwayLayerIds.join(', ')}).` });
  }
  if (footprints) warnings.push({ code: 'footprints-from-background', message: 'The building footprints were read from the shared background map.' });

  return {
    found: own.found || bg.found,
    walkwayMatch: own.found ? own.walkwayMatch : bg.walkwayMatch,
    walkwayElementType: own.found ? own.walkwayElementType : bg.walkwayElementType,
    walkwayLayerIds: own.found ? own.walkwayLayerIds : bg.walkwayLayerIds,
    walkwayShapes: own.found ? own.walkwayShapes : remap(bg.walkwayShapes),
    obstacleShapes: [...own.obstacleShapes, ...remap(bg.obstacleShapes)],
    footprintShapes: footprints ? remap(bg.footprintShapes) : own.footprintShapes,
    roomShapes: own.roomShapes,
    viewBox: own.viewBox,
    warnings,
    namedLayers: own.namedLayers + bg.namedLayers,
    footprintSource: footprints ? bg.footprintSource : own.footprintSource,
    fromBackground: { walkways, footprints, obstacles: bg.obstacleShapes.length > 0 }
  };
};
