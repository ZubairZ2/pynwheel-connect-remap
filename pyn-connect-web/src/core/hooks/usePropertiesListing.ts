'use client';

import { useMemo, useState } from 'react';

import {
  generateCompanyFilterOptions,
  generateDataProviderFilterOptions,
  generateProductFilterOptions,
  generatePropertyColumns,
  generatePropertyListingSummary,
  generatePropertyRows,
  generateStageFilterOptions,
  type PropertyFilterKey,
  type PropertyFilters
} from '~/core/utils/generator/propertyListing.generator';
import { generatePager } from '~/core/utils/generator/pagination.generator';
import type { Property } from '~/core/models/data/property.data';
import type { CompanyFilterOption, Pagination } from '~/core/models/data/session.data';
import { useDebouncedSearch } from './useDebouncedSearch';
import { useListingParams } from './useListingParams';

type Selection = Record<PropertyFilterKey, string[]>;

const FILTER_KEYS: PropertyFilterKey[] = ['stage', 'companyId', 'product', 'dataProvider'];

/** The URL parameter each filter travels as — the names Rails reads. */
const FILTER_PARAMS: Record<PropertyFilterKey, string> = {
  stage: 'stage',
  companyId: 'company_id',
  product: 'product',
  dataProvider: 'data_provider'
};

const selectionOf = (filters: PropertyFilters): Selection => ({
  stage: filters.stage,
  companyId: filters.companyId,
  product: filters.product,
  dataProvider: filters.dataProvider
});

const keyOf = (selection: Selection): string =>
  FILTER_KEYS.map((key) => selection[key].join(',')).join('|');

export const usePropertiesListing = (
  properties: Property[],
  pagination: Pagination | null,
  filters: PropertyFilters,
  options: { companies: CompanyFilterOption[]; dataProviders: string[] },
  scopeTotal: number | null
) => {
  const { setParams, isPending } = useListingParams();
  const { value: query, setValue: setQuery } = useDebouncedSearch(filters.query, (value) =>
    setParams({ q: value })
  );

  // The selection is held here rather than read back from the URL: a tick made
  // while the previous tick's page is still loading must build on that tick,
  // not on the URL it has not reached yet. Every navigation therefore sends
  // all four filters. When the URL moves on its own (back button, a shared
  // link), the selection follows it.
  const urlSelection = selectionOf(filters);
  const [selection, setSelection] = useState<Selection>(urlSelection);
  const [syncedKey, setSyncedKey] = useState(keyOf(urlSelection));
  if (keyOf(urlSelection) !== syncedKey) {
    setSyncedKey(keyOf(urlSelection));
    setSelection(urlSelection);
  }

  const applySelection = (next: Selection) => {
    setSelection(next);
    setParams(
      Object.fromEntries(FILTER_KEYS.map((key) => [FILTER_PARAMS[key], next[key].join(',')]))
    );
  };

  const toggleFilter = (key: PropertyFilterKey, id: string) => {
    const current = selection[key];
    applySelection({
      ...selection,
      [key]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    });
  };

  const clearFilter = (key: PropertyFilterKey) => {
    if (selection[key].length > 0) applySelection({ ...selection, [key]: [] });
  };

  const columns = useMemo(() => generatePropertyColumns(), []);
  const rows = useMemo(() => generatePropertyRows(properties), [properties]);
  const pager = useMemo(() => generatePager(pagination), [pagination]);
  const stageOptions = useMemo(() => generateStageFilterOptions(), []);
  const productOptions = useMemo(() => generateProductFilterOptions(), []);
  const companyOptions = useMemo(
    () => generateCompanyFilterOptions(options.companies),
    [options.companies]
  );
  const dataProviderOptions = useMemo(
    () => generateDataProviderFilterOptions(options.dataProviders),
    [options.dataProviders]
  );
  const summary = useMemo(
    () => generatePropertyListingSummary(scopeTotal, pagination?.totalCount ?? 0, options.companies.length),
    [scopeTotal, pagination, options.companies.length]
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
    summary,
    isPending,
    stageOptions,
    companyOptions,
    productOptions,
    dataProviderOptions,
    goToPage: (page: number) => setParams({ page }, { keepPage: true })
  };
};
