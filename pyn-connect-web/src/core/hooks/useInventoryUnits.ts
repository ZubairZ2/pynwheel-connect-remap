'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { APP_API, APP_ROUTES } from '~/config/app/urls';
import type { InventoryUnit, InventoryUnitListing, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { generateShowingLabel } from '~/core/utils/generator/inventory/floorplans.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import {
  EMPTY_UNIT_FILTERS,
  generateUnitCards,
  generateUnitFilterOptions,
  unitFiltersActive,
  unitListingQuery,
  type UnitFilters
} from '~/core/utils/generator/inventory/units.generator';
import { DEFAULT_PAGE_SIZE, generatePager } from '~/core/utils/generator/pagination.generator';

type ListKey = 'floorplan' | 'availability' | 'building' | 'state' | 'beds' | 'baths' | 'floor';

/** `loading` while a page is on its way (the previous page stays on screen), `ready` once it is here, `failed` until Retry. */
export type UnitsListStatus = 'loading' | 'ready' | 'failed';

/** Typing in the search box or a range waits for a pause before it asks the server. */
const TYPING_DELAY = 350;

const typedOf = (filters: UnitFilters) => ({
  query: filters.query,
  priceMin: filters.priceMin,
  priceMax: filters.priceMax,
  sqftMin: filters.sqftMin,
  sqftMax: filters.sqftMax
});

/**
 * The Units tab, one page at a time. The toolbar's search, filters, page and
 * rows-per-page are the request: each change asks this app's route handler
 * for exactly that page (`/api/properties/:id/inventory/units`, which asks
 * `units.json` for it), so the browser never receives the whole units listing
 * to filter or page it. Toggles request at once; typed inputs after a pause;
 * any change other than paging starts from the first page. The dropdowns'
 * options come with every page (`meta.filters`): one page could not derive them.
 */
export const useInventoryUnits = (inventory: PropertyInventory, today: string) => {
  const propertyId = inventory.property.id;
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_UNIT_FILTERS);
  const [settledTyped, setSettledTyped] = useState(() => typedOf(EMPTY_UNIT_FILTERS));
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [listing, setListing] = useState<InventoryUnitListing | null>(null);
  const [status, setStatus] = useState<UnitsListStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  // The typed fields reach the request only once typing pauses.
  const typed = typedOf(filters);
  const typedKey = JSON.stringify(typed);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledTyped((current) => (JSON.stringify(current) === typedKey ? current : typed)), TYPING_DELAY);
    return () => window.clearTimeout(timer);
    // `typed` is derived from `typedKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedKey]);

  const query = useMemo(
    () => unitListingQuery({ ...filters, ...settledTyped }, page, pageSize, today),
    [filters, settledTyped, page, pageSize, today]
  );

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch(`${APP_API.inventoryUnits(propertyId)}?${query}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign(APP_ROUTES.signIn);
          return;
        }
        const body = (await response.json()) as { ok: boolean; listing?: InventoryUnitListing };
        if (!response.ok || !body.ok || !body.listing) throw new Error(`units listing answered ${response.status}`);
        setListing(body.listing);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return;
        setStatus('failed');
      });
    return () => controller.abort();
  }, [propertyId, query, attempt]);

  // Any change other than paging starts again from the first page.
  const update = useCallback((patch: Partial<UnitFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPageState(1);
  }, []);

  const toggle = useCallback(
    (key: ListKey) => (id: string) => {
      setFilters((current) => ({
        ...current,
        [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id]
      }));
      setPageState(1);
    },
    []
  );

  const options = useMemo(() => generateUnitFilterOptions(inventory, listing?.options ?? null), [inventory, listing?.options]);
  const cards = useMemo(() => generateUnitCards(listing?.units ?? [], inventory, today), [listing?.units, inventory, today]);
  const pager = useMemo(() => generatePager(listing?.pagination ?? null), [listing?.pagination]);
  const matchingCount = listing?.totalCount ?? 0;
  const filtering = unitFiltersActive(filters);

  return {
    filters,
    options,
    cards,
    pager,
    status,
    pageSize,
    setPage: setPageState,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPageState(1);
    },
    retry: () => setAttempt((current) => current + 1),
    /** The unit behind a card on this page (the unit dialog opens on it). */
    unitById: (id: number): InventoryUnit | null => listing?.units.find((unit) => unit.id === id) ?? null,
    /** The units a mass override would apply to: the ones the filters leave. */
    matchingCount,
    showingLabel: generateShowingLabel(status === 'ready' ? matchingCount : inventory.unitCount, inventory.unitCount, S.count.unitOne, S.count.unitMany),
    empty: status === 'ready' && matchingCount === 0,
    hasAny: inventory.unitCount > 0,
    filtering,
    setQuery: (query: string) => update({ query }),
    setPrice: (priceMin: string, priceMax: string) => update({ priceMin, priceMax }),
    setSqft: (sqftMin: string, sqftMax: string) => update({ sqftMin, sqftMax }),
    toggle,
    clear: (key: ListKey) => update({ [key]: [] })
  };
};
