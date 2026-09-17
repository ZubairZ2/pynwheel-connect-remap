'use client';

import { useMemo } from 'react';

import {
  generateCompanyFilterOptions,
  generateProductFilterOptions,
  generatePropertyColumns,
  generatePropertyRows,
  generateStageFilterOptions,
  type PropertyFilters
} from '~/core/utils/generator/propertyListing.generator';
import { generatePager } from '~/core/utils/generator/pagination.generator';
import type { Property } from '~/core/models/data/property.data';
import type { CompanyFilterOption, Pagination } from '~/core/models/data/session.data';
import { useDebouncedSearch } from './useDebouncedSearch';
import { useListingParams } from './useListingParams';

export const usePropertiesListing = (
  properties: Property[],
  pagination: Pagination | null,
  filters: PropertyFilters,
  companyOptions: CompanyFilterOption[]
) => {
  const { setParams, isPending } = useListingParams();
  const { value: query, setValue: setQuery } = useDebouncedSearch(filters.query, (value) =>
    setParams({ q: value })
  );

  const columns = useMemo(() => generatePropertyColumns(), []);
  const rows = useMemo(() => generatePropertyRows(properties), [properties]);
  const pager = useMemo(() => generatePager(pagination), [pagination]);
  const stageOptions = useMemo(() => generateStageFilterOptions(), []);
  const productOptions = useMemo(() => generateProductFilterOptions(), []);
  const companyFilterOptions = useMemo(
    () => generateCompanyFilterOptions(companyOptions),
    [companyOptions]
  );

  return {
    filters: { ...filters, query },
    setQuery,
    setFilter: (key: 'stage' | 'companyId' | 'product', value: string) =>
      setParams({ [key === 'companyId' ? 'company_id' : key]: value }),
    columns,
    rows,
    pager,
    isPending,
    stageOptions,
    companyOptions: companyFilterOptions,
    productOptions,
    goToPage: (page: number) => setParams({ page }, { keepPage: true })
  };
};
