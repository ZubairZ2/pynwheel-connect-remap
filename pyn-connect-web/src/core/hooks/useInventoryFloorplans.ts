'use client';

import { useCallback, useMemo, useState } from 'react';

import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import {
  EMPTY_FLOORPLAN_FILTERS,
  filterFloorplans,
  floorplanFiltersActive,
  generateFloorplanCards,
  generateFloorplanFilterOptions,
  generateShowingLabel,
  sortFloorplans,
  type FloorplanFilters
} from '~/core/utils/generator/inventory/floorplans.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import { useClientPages } from './useClientPages';

const PAGE_SIZE = 20;

type ListKey = 'layout' | 'baths' | 'setup';

/** The Floorplans tab: its filters, the floor plans they leave, one page of cards. */
export const useInventoryFloorplans = (inventory: PropertyInventory) => {
  const [filters, setFilters] = useState<FloorplanFilters>(EMPTY_FLOORPLAN_FILTERS);

  const sorted = useMemo(() => sortFloorplans(inventory.floorplans), [inventory]);
  const options = useMemo(() => generateFloorplanFilterOptions(inventory.floorplans), [inventory]);
  const filtered = useMemo(() => filterFloorplans(sorted, filters), [sorted, filters]);
  const { pageItems, pager, setPage } = useClientPages(filtered, PAGE_SIZE);
  const cards = useMemo(() => generateFloorplanCards(pageItems, inventory), [pageItems, inventory]);

  const update = useCallback((patch: Partial<FloorplanFilters>) => setFilters((current) => ({ ...current, ...patch })), []);

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
    showingLabel: generateShowingLabel(filtered.length, sorted.length, S.count.floorPlanOne, S.count.floorPlanMany),
    empty: filtered.length === 0,
    hasAny: sorted.length > 0,
    filtering: floorplanFiltersActive(filters),
    setQuery: (query: string) => update({ query }),
    setSqft: (sqftMin: string, sqftMax: string) => update({ sqftMin, sqftMax }),
    toggle,
    clear: (key: ListKey) => update({ [key]: [] })
  };
};
