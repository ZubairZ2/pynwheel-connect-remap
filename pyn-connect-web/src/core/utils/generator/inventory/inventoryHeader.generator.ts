import { i18n } from '~/resources/i18n';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { propertyAmenities } from './amenities.generator';
import { S, counted, t } from './inventoryText';

export type InventoryTab = 'floorplates' | 'floorplans' | 'units' | 'amenities';

export const INVENTORY_TABS: InventoryTab[] = ['floorplates', 'floorplans', 'units', 'amenities'];

export const asInventoryTab = (value: string | null | undefined): InventoryTab =>
  INVENTORY_TABS.includes(value as InventoryTab) ? (value as InventoryTab) : 'floorplates';

export interface InventoryHeader {
  name: string;
  /** "4 floorplates · 2 without a floor SVG · 7 tour stops". */
  summary: string;
}

/**
 * The design's "{floorplates} · {published state}" line, from what the CMS
 * records. It has no tour publish state (gap G16), so the tour part is the
 * real stop count rather than "staged / published".
 */
export const generateInventoryHeader = (inventory: PropertyInventory): InventoryHeader => {
  const plates = inventory.floorplates;
  const withoutSvg = plates.filter((plate) => !plate.svg).length;
  const parts: string[] = [];

  if (inventory.mapType === 'sitemap') parts.push(i18n.t(S.header.sitemapMode));
  if (inventory.mapType === 'floorplates' || plates.length > 0) {
    parts.push(counted(plates.length, S.count.floorplateOne, S.count.floorplateMany));
    if (plates.length > 0) parts.push(t(S.header.withoutSvg, { count: withoutSvg }));
  }
  parts.push(
    inventory.tourStopCount > 0
      ? counted(inventory.tourStopCount, S.count.tourStopOne, S.count.tourStopMany)
      : i18n.t(S.header.noTourStops)
  );

  return { name: inventory.property.name, summary: parts.join(' · ') };
};

export interface InventoryTabDescriptor {
  id: InventoryTab;
  label: string;
  count: number;
  active: boolean;
}

/** The four section tabs, each with its real record count (the design's summary badges). */
export const generateInventoryTabs = (inventory: PropertyInventory, active: InventoryTab): InventoryTabDescriptor[] => {
  const counts: Record<InventoryTab, number> = {
    floorplates: inventory.floorplates.length,
    floorplans: inventory.floorplans.length,
    units: inventory.units.length,
    amenities: propertyAmenities(inventory).length
  };

  return INVENTORY_TABS.map((id) => ({
    id,
    label: i18n.t(S.tabs[id]),
    count: counts[id],
    active: id === active
  }));
};
