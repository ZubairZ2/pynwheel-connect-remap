import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit, InventoryUpload } from '~/core/models/data/propertyInventory.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { naturalCompare, rangeText } from '../inventory/inventoryText';
import { M, t } from './mapText';
import type { LocalMapState, PlanOverride, PlanSpace } from './mapState';

/**
 * A level is one map the user can open: a floorplate (the CMS plots units,
 * amenities, hallways and elevators per floorplate, whatever floors it
 * covers), or the property map (Sitemap) of a sitemap-mode property. The
 * design's building pills and floorplate tabs are these, grouped by the
 * floorplate's building.
 */
export interface MapLevel {
  id: string;
  kind: 'floorplate' | 'sitemap';
  recordId: number;
  /** The floorplate's building; null when the CMS has none for it. */
  building: string | null;
  /** The tab's main line: the floor name, else "Floor 3" / "Floors 1–3", else the record name. */
  label: string;
  /** The building, else what the map covers ("Tower A" / "All buildings"). */
  sub: string;
  /** The tab's small line: "Single floor", "Floors 1–3", "Named floor". */
  scopeLabel: string;
  /** What the floorplate covers, from its `range`: "Floors 5–14", "Floor 3", else the floor's name. */
  rangeLabel: string;
  /** The plotting design's tab line: "10 floors · stacked", "1 floor", "Named floor". */
  stackLabel: string;
  floors: number[];
  /** The raster floor image (what every stored raster coordinate is measured on). */
  image: InventoryUpload | null;
  svg: InventoryUpload | null;
  /** Stored size of the raster, when the CMS recorded it. */
  width: number | null;
  height: number | null;
  /** `svg_metadata`: the size the CMS read from the SVG's own attributes. */
  svgWidth: number | null;
  svgHeight: number | null;
}

const floorLabel = (floors: number[], range: string | null): string => {
  if (range) return rangeText(range);
  if (floors.length === 1) return t(M.level.floor, { floor: floors[0] });
  if (floors.length > 1) return t(M.level.floors, { floors: `${floors[0]}–${floors[floors.length - 1]}` });
  return '';
};

const scopeLabel = (floors: number[], floorName: string | null): string => {
  if (floors.length > 1) return t(M.level.floors, { floors: `${floors[0]}–${floors[floors.length - 1]}` });
  if (floorName) return i18n.t(M.level.namedFloor);
  return i18n.t(M.level.singleFloor);
};

/** "Floors 5–14" for a run, "Floors 1, 3" for a list, "Floor 4" for one floor. */
export const floorsText = (floors: number[]): string => {
  if (!floors.length) return '';
  if (floors.length === 1) return t(M.level.floor, { floor: floors[0] });
  const sorted = [...floors].sort((a, b) => a - b);
  const run = sorted.every((floor, index) => index === 0 || floor === sorted[index - 1] + 1);
  return t(M.level.floors, { floors: run ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(', ') });
};

const stackLabel = (floors: number[]): string => {
  if (floors.length > 1) return t(M.level.stacked, { count: floors.length });
  if (floors.length === 1) return i18n.t(M.level.oneFloor);
  return i18n.t(M.level.namedFloor);
};

/**
 * One level per floorplate, lowest floor first (the inventory's order), or the
 * single property map. A floorplate with no building shows the property's
 * only building when it has one, else "All buildings".
 */
export const generateMapLevels = (map: PropertyMap): MapLevel[] => {
  const { inventory, graph } = map;
  const onlyBuilding = graph.buildings.length === 1 ? graph.buildings[0] : null;

  if (inventory.mapType === 'sitemap' && inventory.sitemap) {
    const sitemap = inventory.sitemap;
    return [
      {
        id: `sitemap:${sitemap.id}`,
        kind: 'sitemap',
        recordId: sitemap.id,
        building: null,
        label: i18n.t(M.level.sitemap),
        sub: inventory.property.name,
        scopeLabel: i18n.t(M.level.wholeProperty),
        rangeLabel: i18n.t(M.level.sitemap),
        stackLabel: i18n.t(M.level.wholeProperty),
        floors: [],
        image: sitemap.image,
        svg: sitemap.svg,
        width: sitemap.width,
        height: sitemap.height,
        svgWidth: null,
        svgHeight: null
      }
    ];
  }

  return [...inventory.floorplates]
    .sort((a, b) => {
      const fa = a.floors.length ? Math.min(...a.floors) : Number.POSITIVE_INFINITY;
      const fb = b.floors.length ? Math.min(...b.floors) : Number.POSITIVE_INFINITY;
      return fa === fb ? a.id - b.id : fa - fb;
    })
    .map((plate) => {
      const label = plate.floorName ?? (floorLabel(plate.floors, plate.range) || plate.name);
      return {
        id: `floorplate:${plate.id}`,
        kind: 'floorplate',
        recordId: plate.id,
        building: plate.building,
        label,
        sub: plate.building ?? onlyBuilding ?? i18n.t(M.level.allBuildings),
        scopeLabel: scopeLabel(plate.floors, plate.floorName),
        rangeLabel: plate.floors.length > 1 ? floorsText(plate.floors) : label,
        stackLabel: stackLabel(plate.floors),
        floors: plate.floors,
        image: plate.image,
        svg: plate.svg,
        width: plate.width,
        height: plate.height,
        svgWidth: plate.svgWidth,
        svgHeight: plate.svgHeight
      } satisfies MapLevel;
    });
};

export const levelById = (levels: MapLevel[], id: string | null): MapLevel | null =>
  levels.find((level) => level.id === id) ?? null;

/**
 * The buildings the map is split into: the floorplates' own, then the ones
 * the units and amenities name (the tour's building order), as the legacy
 * page keys its maps per building. Empty when nothing names a building.
 */
export const mapBuildings = (map: PropertyMap, levels: MapLevel[]): string[] => {
  const names: string[] = [];
  const push = (name: string | null) => {
    if (name && !names.includes(name)) names.push(name);
  };
  map.graph.buildings.forEach(push);
  levels.forEach((level) => push(level.building));
  return names.sort(naturalCompare);
};

/** The levels the building pill shows: the building's own floorplates, plus the ones with no building. */
export const levelsOfBuilding = (levels: MapLevel[], building: string | null): MapLevel[] =>
  building ? levels.filter((level) => level.building === building || level.building == null) : levels;

/** The level whose floorplate covers a floor (the legacy `floor_to_floorplate` map), or the property map. */
export const levelForFloor = (levels: MapLevel[], floor: number | null, building: string | null = null): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (floor == null) return null;
  const covering = levels.filter((level) => level.floors.includes(floor));
  if (!covering.length) return null;
  if (building) {
    const own = covering.find((level) => level.building === building);
    if (own) return own;
    const shared = covering.find((level) => level.building == null);
    if (shared) return shared;
  }
  return covering[0];
};

/** Where a unit is plotted, else where its PMS floor and building say it belongs. */
export const levelForUnit = (levels: MapLevel[], unit: InventoryUnit): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (unit.floorplateId != null) {
    const plotted = levels.find((level) => level.kind === 'floorplate' && level.recordId === unit.floorplateId);
    if (plotted) return plotted;
  }
  return levelForFloor(levels, unit.floor, unit.building);
};

export const levelForAmenity = (levels: MapLevel[], amenity: InventoryAmenity): MapLevel | null => {
  if (amenity.ownerType === 'Sitemap') return levels.find((level) => level.kind === 'sitemap') ?? null;
  if (amenity.ownerType === 'Floorplate' && amenity.ownerId != null) {
    const plotted = levels.find((level) => level.kind === 'floorplate' && level.recordId === amenity.ownerId);
    if (plotted) return plotted;
  }
  return levelForFloor(levels, amenity.floor, amenity.building ?? amenity.ownerBuilding);
};

/** A level's drawable raster size: the stored size, else what the browser measured when the image loaded. */
export const levelDims = (level: MapLevel, state: LocalMapState): { w: number; h: number } | null => {
  if (level.width && level.height) return { w: level.width, h: level.height };
  const measured = state.measured[level.id];
  return measured ?? null;
};

/** The floor SVG's coordinate space: the parsed viewBox once loaded, else the CMS's `svg_metadata`. */
export const levelSvgDims = (level: MapLevel, state: LocalMapState): { w: number; h: number } | null => {
  const doc = state.svgDocs[level.id];
  if (doc?.status === 'ready') return { w: doc.doc.viewBox.w, h: doc.doc.viewBox.h };
  if (level.svgWidth && level.svgHeight) return { w: level.svgWidth, h: level.svgHeight };
  return null;
};

/** The size of whichever space is asked for. */
export const levelSpaceDims = (level: MapLevel, state: LocalMapState, space: PlanSpace): { w: number; h: number } | null =>
  space === 'svg' ? levelSvgDims(level, state) : levelDims(level, state);

export interface PlanAssets {
  /** The raster shown under everything (a stored image, or a local preview file). */
  image: { url: string; name: string; local: boolean } | null;
  svg: { url: string; name: string; local: boolean } | null;
  has: boolean;
}

/** What the level's plan bar and canvas show once local uploads and "Remove Plan" are applied. */
export const planAssets = (level: MapLevel, override: PlanOverride | undefined): PlanAssets => {
  const stored = override?.removed ? { image: null, svg: null } : { image: level.image, svg: level.svg };
  const image =
    override?.bg !== undefined
      ? override.bg && { url: override.bg.url, name: override.bg.name, local: true }
      : stored.image && { url: stored.image.url, name: stored.image.fileName, local: false };
  const svg =
    override?.svg !== undefined
      ? override.svg && { url: override.svg.url, name: override.svg.name, local: true }
      : stored.svg && { url: stored.svg.url, name: stored.svg.fileName, local: false };
  return { image: image || null, svg: svg || null, has: !!(image || svg) };
};

/**
 * The layer Wayfinding works on for a level. The floor image when the level
 * has one: the CMS stores hallways, elevators, entry points and doors in the
 * image's pixels (the Auto Wayfinding page and the plotting page's image
 * section both draw them there), and the two files do not share a frame.
 * The floor SVG when that is all the level has, or when Detect Hallways read
 * the hallways from it on this page — the detected graph is in the SVG's
 * units, so the floor is shown and edited on the SVG. Null without a plan.
 */
export const wayfindingSpace = (level: MapLevel, state: Pick<LocalMapState, 'planOverrides' | 'wfSvg'>): PlanSpace | null => {
  const assets = planAssets(level, state.planOverrides[level.id]);
  if (assets.svg && (!assets.image || state.wfSvg[level.id])) return 'svg';
  if (assets.image) return 'raster';
  return null;
};

/** The layer the canvas shows for a level: the floor SVG where there is one and the user has not switched; in Wayfinding, the layer its paths live on. */
export const activeSpace = (level: MapLevel, state: LocalMapState): PlanSpace => {
  const assets = planAssets(level, state.planOverrides[level.id]);
  if (state.mode === 'wayfind') {
    const space = wayfindingSpace(level, state);
    if (space) return space;
  }
  if (assets.svg && assets.image) return state.layer;
  return assets.svg ? 'svg' : 'raster';
};

/** A floorplate whose `range` covers more than one floor: one layout shared by a stack of floors. */
export const isStacked = (level: MapLevel | null): boolean => !!level && level.floors.length > 1;

/** The floor of a stacked level the page looks at: the asked one when the stack covers it, else the stack's first. */
export const stackFloor = (level: MapLevel | null, wanted: number | null): number | null => {
  if (!level || !isStacked(level)) return null;
  return wanted != null && level.floors.includes(wanted) ? wanted : level.floors[0];
};

