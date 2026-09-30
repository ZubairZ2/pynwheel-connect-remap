import 'server-only';

import type { InventoryUnitListing, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import {
  parseInventoryAmenities,
  parseInventoryFloorplans,
  parseInventoryFloorplates,
  parseInventoryProperty,
  parseInventoryUnits
} from '~/core/repository/parser/inventory.parser';
import type { ApiResponse } from './api/base.api';
import { fetchInventoryListing } from './api/inventory.api';

export type InventoryLoad =
  | { status: 'found'; inventory: PropertyInventory }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

export type InventoryUnitsLoad =
  | { status: 'found'; listing: InventoryUnitListing }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

/**
 * Rails decides access per listing. A signed-out request gets 401; a property
 * outside the user's scope is redirected away by `check_community` (302); an
 * id that does not exist is a 404 on at least one of them. Either of the last
 * two reads as "not found", as on the Property Detail page.
 */
const statusOf = (responses: ApiResponse[]): 'unauthorized' | 'missing' | 'failed' | null => {
  if (responses.some((response) => response.status === 401)) return 'unauthorized';
  if (responses.some((response) => response.status === 302 || response.status === 404)) return 'missing';
  if (responses.some((response) => !response.ok || response.body == null)) return 'failed';
  return null;
};

/**
 * One property's inventory: its floorplates, floor plans and amenities, and —
 * unless `units: false` — its units, fetched together.
 *
 * The units listing is most of the inventory's weight (every unit with its
 * images, flags and descriptions: about 290 KB for 230 units), and only the
 * Units tab and the unit dialogs read it. The Inventory screen leaves it out
 * and reads it on demand (`loadInventoryUnits`); the floorplates meta carries
 * its row count, so the Units tab can say how many there are meanwhile.
 */
export const loadPropertyInventory = async (
  cookie: string | null,
  id: number,
  { units: withUnits = true }: { units?: boolean } = {}
): Promise<InventoryLoad> => {
  const [floorplates, floorplans, amenities, units] = await Promise.all([
    fetchInventoryListing(cookie, id, 'floorplates'),
    fetchInventoryListing(cookie, id, 'floorplans'),
    fetchInventoryListing(cookie, id, 'amenities'),
    withUnits ? fetchInventoryListing(cookie, id, 'units') : null
  ]);
  const failure = statusOf([floorplates, floorplans, amenities, ...(units ? [units] : [])]);
  if (failure) return { status: failure };

  const property = parseInventoryProperty(floorplates.body);
  if (!property || property.id !== id) return { status: 'failed' };

  const plates = parseInventoryFloorplates(floorplates.body);
  const plans = parseInventoryFloorplans(floorplans.body);
  const amenityListing = parseInventoryAmenities(amenities.body);
  const unitListing: InventoryUnitListing = units
    ? parseInventoryUnits(units.body)
    : { units: [], currencySymbol: plans.currencySymbol, dataProvider: null, lastSync: null, lockDevices: [] };

  return {
    status: 'found',
    inventory: {
      property,
      ...plates,
      floorplans: plans.floorplans,
      turnAvailabilityOn: plans.turnAvailabilityOn,
      ...unitListing,
      unitsLoaded: !!units,
      unitCount: units ? unitListing.units.length : plates.unitCount,
      ...amenityListing
    }
  };
};

/** The units listing alone: what the Inventory screen reads when its Units tab (or a unit dialog) first opens. */
export const loadInventoryUnits = async (cookie: string | null, id: number): Promise<InventoryUnitsLoad> => {
  const units = await fetchInventoryListing(cookie, id, 'units');
  const failure = statusOf([units]);
  if (failure) return { status: failure };

  const property = parseInventoryProperty(units.body);
  if (!property || property.id !== id) return { status: 'failed' };

  return { status: 'found', listing: parseInventoryUnits(units.body) };
};
