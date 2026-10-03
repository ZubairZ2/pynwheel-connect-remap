import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, withQuery, type ApiResponse } from './base.api';

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

/**
 * One page of the units listing, as the Units tab asks for it. The parameter
 * names are the ones `UnitsController#index` reads for Connect
 * (Connect::UnitListingQuery); each list filter travels as one
 * comma-separated parameter.
 */
export interface UnitListingRequest {
  page: number;
  perPage: number;
  /** The day "available now" is measured against (yyyy-mm-dd, the CMS's zone). */
  today?: string;
  q?: string;
  floorplan?: string[];
  availability?: string[];
  building?: string[];
  state?: string[];
  beds?: string[];
  baths?: string[];
  floor?: string[];
  minPrice?: string;
  maxPrice?: string;
  minSqft?: string;
  maxSqft?: string;
}

/** The `page` parameter is what makes `units.json` answer one page rather than the whole set. */
export const fetchInventoryUnitsPage = (cookie: string | null, propertyId: number, request: UnitListingRequest): Promise<ApiResponse> =>
  apiRequest(
    withQuery(CORE_URLS.inventory.units(propertyId), {
      page: request.page,
      per_page: request.perPage,
      today: request.today,
      q: request.q,
      floorplan: request.floorplan?.join(','),
      availability: request.availability?.join(','),
      building: request.building?.join(','),
      state: request.state?.join(','),
      beds: request.beds?.join(','),
      baths: request.baths?.join(','),
      floor: request.floor?.join(','),
      min_price: request.minPrice,
      max_price: request.maxPrice,
      min_sqft: request.minSqft,
      max_sqft: request.maxSqft
    }),
    { cookie }
  );
