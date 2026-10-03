'use client';

import { useMemo } from 'react';

import { APP_API } from '~/config/app/urls';
import type { Company } from '~/core/models/data/company.data';
import {
  generateCompanyColumns,
  generateCompanyListingSummary,
  generateCompanyPropertiesFilterOptions,
  generateCompanyProviderFilterOptions,
  generateCompanyRows,
  generateCompanyStatusFilterOptions
} from '~/core/utils/generator/companyListing.generator';
import { companiesParamsFromSearch, companiesSearch, type CompaniesListingParams } from '~/core/utils/generator/listingParams';
import { nextListingSort, sortByLabel } from '~/core/utils/generator/listingSort';
import { generatePager } from '~/core/utils/generator/pagination.generator';
import { useServerListing, type ListingData } from './useServerListing';

export type CompanyFilterKey = 'status' | 'pmsProvider' | 'properties';

/**
 * Reads the screen's data, calls the generators, returns descriptors +
 * handlers. Searching, filtering, sorting and paging are server-side, one
 * request per change through `useServerListing`, which also keeps the URL in
 * step and protects the results from out-of-order responses
 * (react-architecture.md §7, §20).
 */
export const useCompaniesListing = (initial: ListingData<Company>, params: CompaniesListingParams) => {
  const listing = useServerListing<Company, CompaniesListingParams>({
    initial,
    params,
    endpoint: APP_API.companiesListing,
    search: companiesSearch,
    parse: companiesParamsFromSearch
  });
  const { rows: companies, meta, params: current, status, update } = listing;

  const toggleFilter = (key: CompanyFilterKey, id: string) => {
    const selected = current[key];
    update({ [key]: selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id] } as Partial<CompaniesListingParams>);
  };

  const clearFilter = (key: CompanyFilterKey) => {
    if (current[key].length > 0) update({ [key]: [] } as Partial<CompaniesListingParams>);
  };

  const columns = useMemo(() => generateCompanyColumns(), []);
  const rows = useMemo(() => generateCompanyRows(companies), [companies]);
  const pager = useMemo(() => generatePager(meta.pagination), [meta.pagination]);
  const statusOptions = useMemo(() => generateCompanyStatusFilterOptions(), []);
  const providerOptions = useMemo(() => generateCompanyProviderFilterOptions(meta.pmsProviderOptions), [meta.pmsProviderOptions]);
  const propertiesOptions = useMemo(() => generateCompanyPropertiesFilterOptions(), []);
  const summary = useMemo(
    () => generateCompanyListingSummary(meta.scopeTotalCount, meta.propertyTotalCount),
    [meta.scopeTotalCount, meta.propertyTotalCount]
  );

  return {
    query: listing.query,
    setQuery: listing.setQuery,
    selection: { status: current.status, pmsProvider: current.pmsProvider, properties: current.properties },
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
    statusOptions,
    providerOptions,
    propertiesOptions,
    goToPage: (page: number) => update({ page }, { keepPage: true }),
    setPageSize: (size: number) => update({ perPage: size }),
    toggleSort: (key: string) => update({ sort: nextListingSort(current.sort, key) }),
    sortLabel: sortByLabel
  };
};
