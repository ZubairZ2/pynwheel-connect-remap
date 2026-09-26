import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit, InventoryUpload } from '~/core/models/data/propertyInventory.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { rangeText } from '../inventory/inventoryText';
import { M, t } from './mapText';
import type { LocalMapState, PlanOverride } from './mapState';

/**
 * A level is one map the user can open: a floorplate (the CMS plots units,
 * amenities, hallways and elevators per floorplate, whatever floors it
 * covers), or the property map (Sitemap) of a sitemap-mode property. The
 * design's "Tower A · Lobby" tabs are these.
 */
export interface MapLevel {
  id: string;
  kind: 'floorplate' | 'sitemap';
  recordId: number;
  /** The floorplate's building; null when the CMS has none for it. */
  building: string | null;
  /** The tab's main line: the floor name, else "Floor 3" / "Floors 1–3", else the record name. */
  label: string;
  /** The tab's small line: the building, else what the map covers. */
  sub: string;
  floors: number[];
  /** The raster floor image (what every stored coordinate is measured on). */
  image: InventoryUpload | null;
  svg: InventoryUpload | null;
  /** Stored size of the raster, when the CMS recorded it. */
  width: number | null;
  height: number | null;
  svgWidth: number | null;
  svgHeight: number | null;
}

const floorLabel = (floors: number[], range: string | null): string => {
  if (range) return rangeText(range);
  if (floors.length === 1) return t(M.level.floor, { floor: floors[0] });
  if (floors.length > 1) return t(M.level.floors, { floors: `${floors[0]}–${floors[floors.length - 1]}` });
  return '';
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
    .map((plate) => ({
      id: `floorplate:${plate.id}`,
      kind: 'floorplate',
      recordId: plate.id,
      building: plate.building,
      label: plate.floorName ?? floorLabel(plate.floors, plate.range) ?? plate.name,
      sub: plate.building ?? onlyBuilding ?? i18n.t(M.level.allBuildings),
      floors: plate.floors,
      image: plate.image,
      svg: plate.svg,
      width: plate.width,
      height: plate.height,
      svgWidth: plate.svgWidth,
      svgHeight: plate.svgHeight
    }));
};

export const levelById = (levels: MapLevel[], id: string | null): MapLevel | null =>
  levels.find((level) => level.id === id) ?? null;

/** The level whose floorplate covers a floor (the legacy `floor_to_floorplate` map), or the property map. */
export const levelForFloor = (levels: MapLevel[], floor: number | null): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (floor == null) return null;
  return levels.find((level) => level.floors.includes(floor)) ?? null;
};

/** Where a unit is plotted, else where its PMS floor says it belongs. */
export const levelForUnit = (levels: MapLevel[], unit: InventoryUnit): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (unit.floorplateId != null) {
    const plotted = levels.find((level) => level.kind === 'floorplate' && level.recordId === unit.floorplateId);
    if (plotted) return plotted;
  }
  return levelForFloor(levels, unit.floor);
};

export const levelForAmenity = (levels: MapLevel[], amenity: InventoryAmenity): MapLevel | null => {
  if (amenity.ownerType === 'Sitemap') return levels.find((level) => level.kind === 'sitemap') ?? null;
  if (amenity.ownerType === 'Floorplate' && amenity.ownerId != null) {
    const plotted = levels.find((level) => level.kind === 'floorplate' && level.recordId === amenity.ownerId);
    if (plotted) return plotted;
  }
  return levelForFloor(levels, amenity.floor);
};

/** A level's drawable size: the stored raster size, else what the browser measured when the image loaded. */
export const levelDims = (level: MapLevel, state: LocalMapState): { w: number; h: number } | null => {
  if (level.width && level.height) return { w: level.width, h: level.height };
  const measured = state.measured[level.id];
  return measured ?? null;
};

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
