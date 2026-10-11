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
import { fetchInventoryListing, fetchInventoryUnitsPage, type UnitListingRequest } from './api/inventory.api';
import { rememberFloorplatesListing } from './planListing.server';

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
 * only when `units: true` — its units, fetched together.
 *
 * The units listing is most of the inventory's weight (every unit with its
 * images, flags and descriptions: about 290 KB for 230 units). The Inventory
 * screen never loads it whole: its Units tab reads one page at a time
 * (`loadInventoryUnitsPage`), and the floorplates meta carries what the other
 * tabs and the dialogs need from the units — their count, their buildings,
 * their manual-marker count, the PMS and last sync, the lock devices. Map &
 * Plotting, Tour Setup and Unit Detail still take every unit: they draw them.
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
  // The plan-svg route resolves a floor SVG's URL from this same listing; let it reuse this one for a minute.
  rememberFloorplatesListing(cookie, id, floorplates);

  const plates = parseInventoryFloorplates(floorplates.body);
  const plans = parseInventoryFloorplans(floorplans.body);
  const amenityListing = parseInventoryAmenities(amenities.body);
  const unitListing = units ? parseInventoryUnits(units.body) : null;

  return {
    status: 'found',
    inventory: {
      property,
      ...plates,
      floorplans: plans.floorplans,
      turnAvailabilityOn: plans.turnAvailabilityOn,
      currencySymbol: unitListing?.currencySymbol ?? plans.currencySymbol,
      units: unitListing?.units ?? [],
      unitsLoaded: !!unitListing,
      unitCount: unitListing ? unitListing.units.length : plates.unitCount,
      ...amenityListing
    }
  };
};

/** One page of the units listing, as the Units tab's toolbar asks for it (`units.json` with a `page`). */
export const loadInventoryUnitsPage = async (cookie: string | null, id: number, request: UnitListingRequest): Promise<InventoryUnitsLoad> => {
  const units = await fetchInventoryUnitsPage(cookie, id, request);
  const failure = statusOf([units]);
  if (failure) return { status: failure };

  const property = parseInventoryProperty(units.body);
  if (!property || property.id !== id) return { status: 'failed' };

  return { status: 'found', listing: parseInventoryUnits(units.body) };
};
