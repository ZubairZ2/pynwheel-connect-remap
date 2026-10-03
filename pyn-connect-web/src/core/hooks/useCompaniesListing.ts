'use client';

import { useMemo, useState } from 'react';

import {
  generateCompanyColumns,
  generateCompanyListingSummary,
  generateCompanyPropertiesFilterOptions,
  generateCompanyProviderFilterOptions,
  generateCompanyRows,
  generateCompanyStatusFilterOptions,
  type CompanyFilterKey,
  type CompanyFilters
} from '~/core/utils/generator/companyListing.generator';
import { listingSortParams, nextListingSort, sortByLabel, type ListingSort } from '~/core/utils/generator/listingSort';
import { DEFAULT_PAGE_SIZE, generatePager } from '~/core/utils/generator/pagination.generator';
import type { Company } from '~/core/models/data/company.data';
import type { Pagination } from '~/core/models/data/session.data';
import { useDebouncedSearch } from './useDebouncedSearch';
import { useListingParams } from './useListingParams';

type Selection = Record<CompanyFilterKey, string[]>;

const FILTER_KEYS: CompanyFilterKey[] = ['status', 'pmsProvider', 'properties'];

/** The URL parameter each filter travels as — the names Rails reads (AccessibleCompaniesQuery). */
const FILTER_PARAMS: Record<CompanyFilterKey, string> = {
  status: 'status',
  pmsProvider: 'pms_provider',
  properties: 'properties'
};

const selectionOf = (filters: CompanyFilters): Selection => ({
  status: filters.status,
  pmsProvider: filters.pmsProvider,
  properties: filters.properties
});

const keyOf = (selection: Selection): string => FILTER_KEYS.map((key) => selection[key].join(',')).join('|');

/**
 * Reads the screen's data, calls the generators, returns descriptors +
 * handlers. Searching, filtering, sorting and paging are server-side, so all
 * of them are expressed as URL changes rather than local work
 * (react-architecture.md §7). The filter selection follows the same pattern
 * as the Properties listing: held locally so a quick second tick builds on
 * the first, re-synced when the URL moves on its own.
 */
export const useCompaniesListing = (
  companies: Company[],
  pagination: Pagination | null,
  filters: CompanyFilters,
  sort: ListingSort | null,
  providerSlugs: string[],
  totals: { companies: number | null; properties: number | null }
) => {
  const { setParams, isPending } = useListingParams();
  const { value: query, setValue: setQuery } = useDebouncedSearch(filters.query, (value) =>
    setParams({ q: value })
  );

  const urlSelection = selectionOf(filters);
  const [selection, setSelection] = useState<Selection>(urlSelection);
  const [syncedKey, setSyncedKey] = useState(keyOf(urlSelection));
  if (keyOf(urlSelection) !== syncedKey) {
    setSyncedKey(keyOf(urlSelection));
    setSelection(urlSelection);
  }

  const applySelection = (next: Selection) => {
    setSelection(next);
    setParams(Object.fromEntries(FILTER_KEYS.map((key) => [FILTER_PARAMS[key], next[key].join(',')])));
  };

  const toggleFilter = (key: CompanyFilterKey, id: string) => {
    const current = selection[key];
    applySelection({
      ...selection,
      [key]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    });
  };

  const clearFilter = (key: CompanyFilterKey) => {
    if (selection[key].length > 0) applySelection({ ...selection, [key]: [] });
  };

  const columns = useMemo(() => generateCompanyColumns(), []);
  const rows = useMemo(() => generateCompanyRows(companies), [companies]);
  const pager = useMemo(() => generatePager(pagination), [pagination]);
  const statusOptions = useMemo(() => generateCompanyStatusFilterOptions(), []);
  const providerOptions = useMemo(() => generateCompanyProviderFilterOptions(providerSlugs), [providerSlugs]);
  const propertiesOptions = useMemo(() => generateCompanyPropertiesFilterOptions(), []);
  const summary = useMemo(
    () => generateCompanyListingSummary(totals.companies, totals.properties),
    [totals.companies, totals.properties]
  );

  return {
    query,
    setQuery,
    selection,
    toggleFilter,
    clearFilter,
    columns,
    rows,
    pager,
    pageSize: pagination?.perPage ?? DEFAULT_PAGE_SIZE,
    summary,
    isPending,
    statusOptions,
    providerOptions,
    propertiesOptions,
    goToPage: (page: number) => setParams({ page }, { keepPage: true }),
    // A new size starts again from page 1; the default size needs no parameter.
    setPageSize: (size: number) => setParams({ per_page: size === DEFAULT_PAGE_SIZE ? '' : size }),
    // A new order starts again from page 1.
    toggleSort: (key: string) => setParams(listingSortParams(nextListingSort(sort, key))),
    sortLabel: sortByLabel
  };
};
