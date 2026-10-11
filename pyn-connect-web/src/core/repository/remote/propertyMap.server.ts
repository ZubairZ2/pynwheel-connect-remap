import 'server-only';

import type { InventoryAmenity, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { parseWayfindingGraph, parseWayfindingWriteMeta } from '~/core/repository/parser/wayfinding.parser';
import { loadPropertyInventory } from './propertyInventory.server';
import { fetchWayfindingGraph } from './api/wayfinding.api';

export type PropertyMapLoad =
  | { status: 'found'; map: PropertyMap }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

/**
 * Everything the Map & Plotting screen draws, fetched together: the property's
 * inventory (floor plates are the maps; units and amenities are the pins) and
 * the wayfinding graph the legacy Auto Wayfinding page reads.
 *
 * The statuses follow the inventory loader: 401 is a sign-out, a 302 or a 404
 * on any listing reads as "not found", anything else that is not a 200 is a
 * failure.
 */
export const loadPropertyMap = async (cookie: string | null, id: number): Promise<PropertyMapLoad> => {
  const [inventory, graph] = await Promise.all([loadPropertyInventory(cookie, id), fetchWayfindingGraph(cookie, id)]);

  if (inventory.status === 'unauthorized' || graph.status === 401) return { status: 'unauthorized' };
  if (inventory.status === 'missing' || graph.status === 302 || graph.status === 404) return { status: 'missing' };
  if (inventory.status !== 'found' || !graph.ok || graph.body == null) return { status: 'failed' };

  const parsed = parseWayfindingGraph(graph.body);
  if (!parsed) return { status: 'failed' };

  return { status: 'found', map: { inventory: inventory.inventory, graph: parsed, write: parseWayfindingWriteMeta(graph.body) } };
};

/**
 * The map model with the fields the Map & Plotting screen never reads
 * emptied, for the page that hands it to the browser.
 *
 * `units.json` carries everything the units grid, the unit form and the Tour
 * Setup talking points show — lease terms, the three buttons, interior
 * images, photos, descriptions — at about 1.2 KB a unit; the map reads a
 * unit's identity, placement and plan only. Emptied before the model is
 * serialized into the page, the document and the RSC payload of a
 * 339-unit property shrink by more than half (performance audit, October 11,
 * 2026: C5). The shape is unchanged, so every generator keeps its type; the
 * Tour Setup screen keeps the full model (it prints the descriptions and
 * photos).
 */
export const trimForMapScreen = (map: PropertyMap): PropertyMap => ({
  ...map,
  inventory: {
    ...map.inventory,
    units: map.inventory.units.map(trimUnit),
    amenities: map.inventory.amenities.map(trimAmenity)
  }
});

const trimUnit = (unit: InventoryUnit): InventoryUnit => ({
  ...unit,
  image: null,
  secondaryImage: null,
  interiorImages: [],
  buttons: [],
  leaseTerms: [],
  additionalFee: null,
  descriptionTitle: null,
  description: null,
  stopDescription: null
});

const trimAmenity = (amenity: InventoryAmenity): InventoryAmenity => ({
  ...amenity,
  image: null,
  gallery: [],
  videoLink: null,
  videoLinkButtonLabel: null,
  description: null,
  directionalText: null
});
