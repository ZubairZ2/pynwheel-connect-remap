'use client';

import { useCallback, useMemo, useState } from 'react';

import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import {
  EMPTY_AMENITY_FILTERS,
  amenityFiltersActive,
  filterAmenities,
  generateAmenityCards,
  generateAmenityFilterOptions,
  propertyAmenities,
  sortAmenities,
  type AmenityFilters
} from '~/core/utils/generator/inventory/amenities.generator';
import { generateShowingLabel } from '~/core/utils/generator/inventory/floorplans.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import { useClientPages } from './useClientPages';

type ListKey = 'type' | 'building' | 'floor' | 'lock' | 'state' | 'setup';

/**
 * The Amenities tab: every amenity of the property is already in the browser,
 * so each filter narrows it at once. Only one page of cards is rendered (25 a
 * page by default).
 */
export const useInventoryAmenities = (inventory: PropertyInventory) => {
  const [filters, setFilters] = useState<AmenityFilters>(EMPTY_AMENITY_FILTERS);

  const sorted = useMemo(() => sortAmenities(propertyAmenities(inventory)), [inventory]);
  const options = useMemo(() => generateAmenityFilterOptions(sorted, inventory), [sorted, inventory]);
  const filtered = useMemo(() => filterAmenities(sorted, filters), [sorted, filters]);
  const { pageItems, pager, setPage, pageSize, setPageSize } = useClientPages(filtered);
  const cards = useMemo(() => generateAmenityCards(pageItems, inventory.selfTour), [pageItems, inventory.selfTour]);

  const update = useCallback((patch: Partial<AmenityFilters>) => setFilters((current) => ({ ...current, ...patch })), []);

  const toggle = useCallback(
    (key: ListKey) => (id: string) =>
      setFilters((current) => ({
        ...current,
        [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id]
      })),
    []
  );

  return {
    filters,
    options,
    cards,
    pager,
    setPage,
    pageSize,
    setPageSize,
    showingLabel: generateShowingLabel(filtered.length, sorted.length, S.count.amenityOne, S.count.amenityMany),
    empty: filtered.length === 0,
    hasAny: sorted.length > 0,
    filtering: amenityFiltersActive(filters),
    setQuery: (query: string) => update({ query }),
    toggle,
    clear: (key: ListKey) => update({ [key]: [] })
  };
};
