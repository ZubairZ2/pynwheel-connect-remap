import 'server-only';

import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
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

/**
 * One property's whole inventory: its four listings, fetched together.
 *
 * Rails decides access per listing. A signed-out request gets 401; a property
 * outside the user's scope is redirected away by `check_community` (302); an
 * id that does not exist is a 404 on at least one of them. Either of the last
 * two reads as "not found", as on the Property Detail page.
 */
export const loadPropertyInventory = async (cookie: string | null, id: number): Promise<InventoryLoad> => {
  const [floorplates, floorplans, units, amenities] = await Promise.all([
    fetchInventoryListing(cookie, id, 'floorplates'),
    fetchInventoryListing(cookie, id, 'floorplans'),
    fetchInventoryListing(cookie, id, 'units'),
    fetchInventoryListing(cookie, id, 'amenities')
  ]);
  const responses: ApiResponse[] = [floorplates, floorplans, units, amenities];

  if (responses.some((response) => response.status === 401)) return { status: 'unauthorized' };
  if (responses.some((response) => response.status === 302 || response.status === 404)) return { status: 'missing' };
  if (responses.some((response) => !response.ok || response.body == null)) return { status: 'failed' };

  const property = parseInventoryProperty(floorplates.body);
  if (!property || property.id !== id) return { status: 'failed' };

  const plates = parseInventoryFloorplates(floorplates.body);
  const plans = parseInventoryFloorplans(floorplans.body);
  const unitListing = parseInventoryUnits(units.body);
  const amenityListing = parseInventoryAmenities(amenities.body);

  return {
    status: 'found',
    inventory: {
      property,
      ...plates,
      floorplans: plans.floorplans,
      turnAvailabilityOn: plans.turnAvailabilityOn,
      ...unitListing,
      ...amenityListing
    }
  };
};
