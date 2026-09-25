import { i18n } from '~/resources/i18n';
import type { InventoryFloorplate, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type {
  ConfirmDescriptor,
  ImageDescriptor,
  MetaDescriptor,
  PillDescriptor,
  ThumbDescriptor
} from './inventory.types';
import { EMPTY, S, counted, rangeText, t } from './inventoryText';

/**
 * The Floorplates tab: one card per `floorplates` row, the Background Library,
 * and — for a property whose map is one site plan — its property map.
 */

/** Floorplates are usually named by their floor ("4"); a bare number reads as "Floor 4". */
export const floorplateTitle = (plate: Pick<InventoryFloorplate, 'name' | 'range'>): string => {
  const name = plate.name.trim();
  if (/^-?\d+$/.test(name)) return t(S.floorplates.floor, { floor: name });
  return name || rangeText(plate.range) || EMPTY;
};

export interface FloorplateCard {
  id: number;
  title: string;
  svgPill: PillDescriptor;
  hasSvg: boolean;
  thumb: ThumbDescriptor;
  meta: MetaDescriptor[];
  /** The floor image and the floor SVG, whichever exist. */
  images: ImageDescriptor[];
  deleteConfirm: ConfirmDescriptor;
  removeSvgConfirm: ConfirmDescriptor;
}

const plottedOf = (count: number, plotted: number, one: string, many: string): string =>
  count > 0 ? `${counted(count, one, many)} · ${t(S.count.plotted, { count: plotted })}` : counted(0, one, many);

/**
 * Lowest floor first; floorplates without a range last. The legacy list's own
 * order (`number DESC, id DESC`, with `number` unset almost everywhere) reads as
 * random, so the cards are ordered by the floors they cover.
 */
const byFloor = (a: InventoryFloorplate, b: InventoryFloorplate): number => {
  const lowest = (plate: InventoryFloorplate) => (plate.floors.length ? Math.min(...plate.floors) : Infinity);
  return lowest(a) - lowest(b) || a.name.localeCompare(b.name, 'en', { numeric: true });
};

export const generateFloorplateCards = (inventory: PropertyInventory): FloorplateCard[] =>
  [...inventory.floorplates].sort(byFloor).map((plate) => {
    const title = floorplateTitle(plate);
    const images: ImageDescriptor[] = [];
    if (plate.image) images.push({ name: `${title} — ${i18n.t(S.floorplates.floorImage)}`, src: plate.image.url });
    if (plate.svg) images.push({ name: `${title} — ${i18n.t(S.floorplates.floorSvg)}`, src: plate.svg.url });

    const plotted = plate.plottedUnitCount + plate.plottedAmenityCount;

    return {
      id: plate.id,
      title,
      hasSvg: !!plate.svg,
      svgPill: plate.svg
        ? { label: i18n.t(S.floorplates.svgReady), variant: 'ok' }
        : { label: i18n.t(S.floorplates.svgMissing), variant: 'crit' },
      // The legacy table shows the raster floor image first, then the SVG.
      thumb: {
        src: plate.image?.url ?? plate.svg?.url ?? null,
        badge: plate.image ? i18n.t(S.floorplates.badgeImage) : plate.svg ? i18n.t(S.floorplates.badgeSvg) : undefined,
        alt: `${title} — ${i18n.t(plate.image ? S.floorplates.floorImage : S.floorplates.floorSvg)}`
      },
      meta: [
        { label: i18n.t(S.floorplates.meta.range), value: rangeText(plate.range) || EMPTY },
        {
          label: i18n.t(S.floorplates.meta.naming),
          value: i18n.t(plate.manualOverride ? S.floorplates.manualName : S.floorplates.autoName)
        },
        {
          label: i18n.t(S.floorplates.meta.nameOnMap),
          value: plate.floorNameAdded
            ? plate.floorName
              ? t(S.floorplates.shownAs, { name: plate.floorName })
              : i18n.t(S.floorplates.shown)
            : i18n.t(S.floorplates.hidden)
        },
        { label: i18n.t(S.floorplates.meta.building), value: plate.building ?? EMPTY },
        {
          label: i18n.t(S.floorplates.meta.background),
          // The design's Background picker; the CMS keeps no library (G15), so
          // the only option is what the property really has.
          value: i18n.t(inventory.sharedBackground ? S.floorplates.sharedBackground : S.floorplates.noBackground),
          control: 'select'
        },
        {
          label: i18n.t(S.floorplates.meta.units),
          value: plottedOf(plate.unitCount, plate.plottedUnitCount, S.count.unitOne, S.count.unitMany)
        },
        {
          label: i18n.t(S.floorplates.meta.amenities),
          value: plottedOf(plate.amenityCount, plate.plottedAmenityCount, S.count.amenityOne, S.count.amenityMany)
        }
      ],
      images,
      deleteConfirm: {
        title: t(S.dialogs.confirm.deleteFloorplateTitle, { name: title }),
        message: t(S.dialogs.confirm.deleteFloorplateBody, {
          items: counted(plotted, S.count.itemOne, S.count.itemMany)
        }),
        label: i18n.t(S.dialogs.confirm.deleteFloorplateLabel)
      },
      removeSvgConfirm: {
        title: i18n.t(S.dialogs.confirm.removeSvgTitle),
        message: i18n.t(S.dialogs.confirm.removeSvgBody),
        label: i18n.t(S.dialogs.confirm.removeLabel)
      }
    };
  });

export interface BackgroundLibraryItem {
  name: string;
  fileName: string;
  usage: string;
  src: string;
}

export interface BackgroundLibrary {
  summary: string;
  items: BackgroundLibraryItem[];
}

/**
 * The CMS keeps no library of named backgrounds (gap G15). The one shared
 * background it has is a Beans property's base map, which every floor SVG
 * overlays; when there is one, it is the library's only entry.
 */
export const generateBackgroundLibrary = (inventory: PropertyInventory): BackgroundLibrary => {
  const shared = inventory.sharedBackground;
  const items = shared
    ? [
        {
          name: i18n.t(S.backgrounds.sharedName),
          fileName: shared.fileName,
          usage: i18n.t(S.backgrounds.usedByAll),
          src: shared.url
        }
      ]
    : [];

  return { summary: counted(items.length, S.count.backgroundOne, S.count.backgroundMany), items };
};

export interface SitemapPanel {
  thumb: ThumbDescriptor;
  images: ImageDescriptor[];
}

/** Shown only for a property in property-map (sitemap) mode. */
export const generateSitemapPanel = (inventory: PropertyInventory): SitemapPanel | null => {
  if (inventory.mapType !== 'sitemap') return null;

  const sitemap = inventory.sitemap;
  const images: ImageDescriptor[] = [];
  if (sitemap?.image) images.push({ name: i18n.t(S.floorplates.sitemapImage), src: sitemap.image.url });
  if (sitemap?.svg) images.push({ name: i18n.t(S.floorplates.sitemapSvg), src: sitemap.svg.url });

  return {
    thumb: {
      src: images[0]?.src ?? null,
      badge: sitemap?.image
        ? i18n.t(S.floorplates.badgeImage)
        : sitemap?.svg
          ? i18n.t(S.floorplates.badgeSvg)
          : undefined,
      alt: images[0]?.name ?? i18n.t(S.floorplates.sitemapImage)
    },
    images
  };
};
