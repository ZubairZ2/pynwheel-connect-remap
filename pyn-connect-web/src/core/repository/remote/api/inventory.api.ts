import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, type ApiResponse } from './base.api';

export type InventoryListing = keyof typeof CORE_URLS.inventory;

/**
 * GET one of a property's four inventory listings — the existing
 * Floorplates/Floorplans/Units/Amenities `index` actions, as JSON. Each answers
 * with every record the property has; Rails scopes the property to the user
 * (`check_community`), redirecting (302) when it is not theirs.
 */
export const fetchInventoryListing = (
  cookie: string | null,
  propertyId: number,
  listing: InventoryListing
): Promise<ApiResponse> => apiRequest(CORE_URLS.inventory[listing](propertyId), { cookie });
