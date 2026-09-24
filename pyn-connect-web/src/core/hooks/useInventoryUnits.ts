'use client';

import { useCallback, useMemo, useState } from 'react';

import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { generateShowingLabel } from '~/core/utils/generator/inventory/floorplans.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import {
  EMPTY_UNIT_FILTERS,
  filterUnits,
  generateUnitCards,
  generateUnitFilterOptions,
  sortUnits,
  unitFiltersActive,
  type UnitFilters
} from '~/core/utils/generator/inventory/units.generator';
import { useClientPages } from './useClientPages';

const PAGE_SIZE = 25;

type ListKey = 'floorplan' | 'availability' | 'building' | 'state' | 'beds' | 'baths' | 'floor';

/**
 * The Units tab: every unit of the property is already in the browser, so each
 * filter narrows it at once. Only one page of cards is rendered.
 */
export const useInventoryUnits = (inventory: PropertyInventory, today: string) => {
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_UNIT_FILTERS);

  const sorted = useMemo(() => sortUnits(inventory.units), [inventory]);
  const options = useMemo(() => generateUnitFilterOptions(inventory), [inventory]);
  const filtered = useMemo(() => filterUnits(sorted, filters, inventory, today), [sorted, filters, inventory, today]);
  const { pageItems, pager, setPage } = useClientPages(filtered, PAGE_SIZE);
  const cards = useMemo(() => generateUnitCards(pageItems, inventory, today), [pageItems, inventory, today]);

  const update = useCallback((patch: Partial<UnitFilters>) => setFilters((current) => ({ ...current, ...patch })), []);

  const toggle = useCallback(
    (key: ListKey) => (id: string) =>
      setFilters((current) => ({
        ...current,
        [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id]
      })),
    []
  );

  const filtering = unitFiltersActive(filters);

  return {
    filters,
    options,
    cards,
    pager,
    setPage,
    /** The units a mass override would apply to: the ones the filters leave. */
    matchingCount: filtered.length,
    showingLabel: generateShowingLabel(filtered.length, sorted.length, S.count.unitOne, S.count.unitMany),
    empty: filtered.length === 0,
    hasAny: sorted.length > 0,
    filtering,
    setQuery: (query: string) => update({ query }),
    setPrice: (priceMin: string, priceMax: string) => update({ priceMin, priceMax }),
    setSqft: (sqftMin: string, sqftMax: string) => update({ sqftMin, sqftMax }),
    toggle,
    clear: (key: ListKey) => update({ [key]: [] })
  };
};
