'use client';

import { useMemo } from 'react';

import { APP_API } from '~/config/app/urls';
import type { Property } from '~/core/models/data/property.data';
import { propertiesParamsFromSearch, propertiesSearch, type PropertiesListingParams } from '~/core/utils/generator/listingParams';
import { nextListingSort, sortByLabel } from '~/core/utils/generator/listingSort';
import { generatePager } from '~/core/utils/generator/pagination.generator';
import {
  generateCompanyFilterOptions,
  generateDataProviderFilterOptions,
  generateProductFilterOptions,
  generatePropertyColumns,
  generatePropertyListingSummary,
  generatePropertyRows,
  generateStageFilterOptions,
  type PropertyFilterKey
} from '~/core/utils/generator/propertyListing.generator';
import { useServerListing, type ListingData } from './useServerListing';

/**
 * The Properties listing on `useServerListing`: one request per change of
 * search, filter, sort, page or size, the URL kept in step, out-of-order
 * responses ignored. The filter options the page cannot derive (companies,
 * data providers) come with every page in `meta`.
 */
export const usePropertiesListing = (initial: ListingData<Property>, params: PropertiesListingParams) => {
  const listing = useServerListing<Property, PropertiesListingParams>({
    initial,
    params,
    endpoint: APP_API.propertiesListing,
    search: propertiesSearch,
    parse: propertiesParamsFromSearch
  });
  const { rows: properties, meta, params: current, status, update } = listing;

  const toggleFilter = (key: PropertyFilterKey, id: string) => {
    const selected = current[key];
    update({ [key]: selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id] } as Partial<PropertiesListingParams>);
  };

  const clearFilter = (key: PropertyFilterKey) => {
    if (current[key].length > 0) update({ [key]: [] } as Partial<PropertiesListingParams>);
  };

  const columns = useMemo(() => generatePropertyColumns(), []);
  const rows = useMemo(() => generatePropertyRows(properties), [properties]);
  const pager = useMemo(() => generatePager(meta.pagination), [meta.pagination]);
  const stageOptions = useMemo(() => generateStageFilterOptions(), []);
  const productOptions = useMemo(() => generateProductFilterOptions(), []);
  const companyOptions = useMemo(() => generateCompanyFilterOptions(meta.companyOptions), [meta.companyOptions]);
  const dataProviderOptions = useMemo(() => generateDataProviderFilterOptions(meta.dataProviderOptions), [meta.dataProviderOptions]);
  const summary = useMemo(
    () => generatePropertyListingSummary(meta.scopeTotalCount, meta.pagination?.totalCount ?? 0, meta.companyOptions.length),
    [meta.scopeTotalCount, meta.pagination, meta.companyOptions.length]
  );

  return {
    query: listing.query,
    setQuery: listing.setQuery,
    selection: { stage: current.stage, companyId: current.companyId, product: current.product, dataProvider: current.dataProvider },
    toggleFilter,
    clearFilter,
    columns,
    rows,
    pager,
    pageSize: current.perPage,
    sort: current.sort,
    summary,
    isPending: status === 'loading',
    failed: status === 'failed',
    retry: listing.retry,
    stageOptions,
    companyOptions,
    productOptions,
    dataProviderOptions,
    goToPage: (page: number) => update({ page }, { keepPage: true }),
    setPageSize: (size: number) => update({ perPage: size }),
    toggleSort: (key: string) => update({ sort: nextListingSort(current.sort, key) }),
    sortLabel: sortByLabel
  };
};
